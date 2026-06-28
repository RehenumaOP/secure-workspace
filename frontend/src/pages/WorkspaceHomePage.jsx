import { useState, useContext, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { createTask } from '../service/taskService'
import { inviteMember } from '../service/workspaceService'
import api from '../service/api'
import toast from 'react-hot-toast'


// ── Modal wrapper — OUTSIDE to prevent remount ──
function Modal({ show, onClose, title, children }) {
  if (!show) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900 text-base">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Reusable field components — OUTSIDE ──
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

// ── Shared select component — OUTSIDE (ESLint Fix) ──
const WsSelect = ({ value, onChange, workspaces }) => (
  <Field label="Workspace">
    <select value={value} onChange={onChange}
      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
      <option value="">Select a workspace</option>
      {workspaces?.map(ws => (
        <option key={ws.id} value={ws.id}>{ws.name}</option>
      ))}
    </select>
  </Field>
)

function GradientBtn({ disabled, loading, label, onClick, type = 'submit' }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className="flex-1 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-50 transition-opacity"
      style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}
    >
      {loading ? 'Please wait...' : label}
    </button>
  )
}

function CancelBtn({ onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition-colors">
      Cancel
    </button>
  )
}

// ─────────────────────────────────────────────────────────
function WorkspaceHomePage() {
  const { user } = useContext(AuthContext)
  const { workspaces, refreshWorkspaces } = useOutletContext()
  const navigate = useNavigate()

  // Modal visibility
  const [modal, setModal] = useState(null) // 'task' | 'invite' | 'upload' | null
  const closeModal = () => setModal(null)

  // Form states
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', workspace_id: '' })
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member', workspace_id: '' })
  const [uploadForm, setUploadForm] = useState({ workspace_id: '', file: null })
  const [submitting, setSubmitting] = useState(false)

  // Add pending invites state
  const [pendingInvites, setPendingInvites] = useState([])

  // Load invites from backend on mount
  useEffect(() => {
    const loadInvites = async () => {
      try {
        const res = await api.get('/api/workspaces/my-invites')
        setPendingInvites(res.data.invites)
      } catch {
        // silent fail
      }
    }
    loadInvites()
  }, [])

  const handleAcceptInvite = async (workspaceId) => {
    try {
      await api.post(`/api/workspaces/${workspaceId}/accept-invite`)
      toast.success('You joined the workspace!')
      setPendingInvites(prev => prev.filter(i => i.workspace_id !== workspaceId))
      refreshWorkspaces()

      navigate('/workspaces/${workspaceId}')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to accept invite')
    }
  }

  // ── Handlers ──────────────────────────────────────────

  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!taskForm.workspace_id) { toast.error('Select a workspace'); return }
    if (!taskForm.title.trim()) { toast.error('Task title is required'); return }
    setSubmitting(true)
    try {
      await createTask(taskForm.workspace_id, {
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
      })
      toast.success('Task created!')
      setTaskForm({ title: '', description: '', priority: 'medium', workspace_id: '' })
      closeModal()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteForm.workspace_id) { toast.error('Select a workspace'); return }
    if (!inviteForm.email.trim()) { toast.error('Email is required'); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteForm.email)) { toast.error('Enter a valid email address'); return }
    setSubmitting(true)
    try {
      await inviteMember(inviteForm.workspace_id, {
        email: inviteForm.email,
        role: inviteForm.role,
      })
      toast.success(`Invite sent to ${inviteForm.email}!`)
      setInviteForm({ email: '', role: 'member', workspace_id: '' })
      closeModal()
      refreshWorkspaces()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send invite')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileUpload = async (e) => {
    e.preventDefault()
    if (!uploadForm.workspace_id) { toast.error('Select a workspace'); return }
    if (!uploadForm.file) { toast.error('Select a file to upload'); return }
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadForm.file)
      formData.append('workspace_id', uploadForm.workspace_id)

      await api.post('/api/files/upload', formData, {
        headers: {'Content-Type': 'multipart/form-data'}
      })
      
      toast.success(`"${uploadForm.file.name}" uploaded!`)
      setUploadForm({ workspace_id: '', file: null })
      closeModal()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Quick actions definition ──
  const QUICK_ACTIONS = [
    {
      icon: '✅', title: 'Create new task', desc: 'Start something new.',
      bg: 'from-indigo-50 to-blue-50', border: 'border-indigo-100',
      action: () => workspaces.length > 0 ? setModal('task') : toast.error('Create a workspace first'),
    },
    {
      icon: '📅', title: 'Connect calendar', desc: 'View task deadlines.',
      bg: 'from-purple-50 to-indigo-50', border: 'border-purple-100',
      action: () => navigate('/calendar'),
    },
    {
      icon: '👥', title: 'Invite teammates', desc: 'Grow your team.',
      bg: 'from-violet-50 to-purple-50', border: 'border-violet-100',
      action: () => workspaces.length > 0 ? setModal('invite') : toast.error('Create a workspace first'),
    },
    {
      icon: '📁', title: 'Upload a file', desc: 'Drop in a doc.',
      bg: 'from-blue-50 to-indigo-50', border: 'border-blue-100',
      action: () => workspaces.length > 0 ? setModal('upload') : toast.error('Create a workspace first'),
    },
    {
      icon: '🔒', title: 'Security dashboard', desc: 'Review login history.',
      bg: 'from-indigo-50 to-violet-50', border: 'border-indigo-100',
      action: () => navigate('/security'),
    },
    {
      icon: '🚀', title: 'Open workspace', desc: "Dive into a project.",
      bg: 'from-purple-50 to-pink-50', border: 'border-purple-100',
      action: () => workspaces.length > 0
        ? navigate(`/workspaces/${workspaces[0].id}`)
        : toast.error('Create a workspace first'),
    },
  ]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">

      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, {user?.name?.split(' ')[0]}! 👋</h1>
        <p className="text-gray-400 mt-1 text-sm">Here's what's happening in your workspace.</p>
      </div>

      {/* Pending invites banner */}
      {pendingInvites.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
            📨 Pending Invitations
          </h2>
          {pendingInvites.map(invite => (
            <div key={invite.workspace_id}
              className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between animate-in">
              <div>
                <p className="text-sm font-semibold text-gray-800">{invite.workspace_name}</p>
                <p className="text-xs text-gray-400">{invite.description || 'No description'}</p>
              </div>
              <button
                onClick={() => handleAcceptInvite(invite.workspace_id)}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}
              >
                Accept
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Workspaces', value: workspaces.length, icon: '🏢', color: 'from-indigo-500 to-purple-600' },
          { label: 'Total Members', value: workspaces.reduce((a, w) => a + (w.member_count || 0), 0), icon: '👥', color: 'from-purple-500 to-pink-500' },
          { label: 'Active Projects', value: workspaces.length, icon: '🚀', color: 'from-blue-500 to-indigo-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br- ${stat.color} flex items-center justify-center text-lg mb-3`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.title}
              onClick={action.action}
              className={`bg-gradient-to-br- ${action.bg} border ${action.border} rounded-2xl p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-150`}
            >
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl mb-3">
                {action.icon}
              </div>
              <p className="font-semibold text-gray-800 text-sm">{action.title}</p>
              <p className="text-gray-400 text-xs mt-0.5">{action.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Workspaces */}
      {workspaces.length > 0 ? (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Your Workspaces</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {workspaces.map(ws => (
              <button key={ws.id} onClick={() => navigate(`/workspaces/${ws.id}`)}
                className="bg-white border border-gray-100 rounded-2xl p-4 text-left hover:border-indigo-200 hover:shadow-md transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                    {ws.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-indigo-700 transition-colors">{ws.name}</p>
                    <p className="text-xs text-gray-400">{ws.member_count} member{ws.member_count !== 1 ? 's' : ''} · {new Date(ws.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-gray-300 group-hover:text-indigo-400 transition-colors text-lg shrink-0">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-indigo-100">
          <div className="text-5xl mb-3">🏢</div>
          <h3 className="font-semibold text-gray-700 mb-1">No workspaces yet</h3>
          <p className="text-gray-400 text-sm">Use the sidebar or the button above to create your first workspace</p>
        </div>
      )}

      {/* ════ MODALS ════ */}

      {/* Create Task */}
      <Modal show={modal === 'task'} onClose={closeModal} title="Create New Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <WsSelect
            value={taskForm.workspace_id}
            workspaces={workspaces}
            onChange={(e) => setTaskForm(p => ({ ...p, workspace_id: e.target.value }))}
          />
          <Field label="Task Title *">
            <input
              type="text"
              value={taskForm.title}
              onChange={(e) => setTaskForm(p => ({ ...p, title: e.target.value }))}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Field>
          <Field label="Description (optional)">
            <textarea
              value={taskForm.description}
              onChange={(e) => setTaskForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Add details..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </Field>
          <Field label="Priority">
            <select
              value={taskForm.priority}
              onChange={(e) => setTaskForm(p => ({ ...p, priority: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
          </Field>
          <div className="flex gap-2 pt-1">
            <GradientBtn loading={submitting} label="Create Task" />
            <CancelBtn onClick={closeModal} />
          </div>
        </form>
      </Modal>

      {/* Invite Teammate */}
      <Modal show={modal === 'invite'} onClose={closeModal} title="Invite Teammate">
        <form onSubmit={handleInvite} className="space-y-4">
          <WsSelect
            value={inviteForm.workspace_id}
            workspaces={workspaces}
            onChange={(e) => setInviteForm(p => ({ ...p, workspace_id: e.target.value }))}
          />
          <Field label="Email Address *">
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm(p => ({ ...p, email: e.target.value }))}
              placeholder="teammate@company.com"
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Field>
          <Field label="Role">
            <select
              value={inviteForm.role}
              onChange={(e) => setInviteForm(p => ({ ...p, role: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="member">Member — can create and edit tasks</option>
              <option value="viewer">Viewer — read only</option>
              <option value="admin">Admin — full access</option>
            </select>
          </Field>
          <div className="flex gap-2 pt-1">
            <GradientBtn loading={submitting} label="Send Invite" />
            <CancelBtn onClick={closeModal} />
          </div>
        </form>
      </Modal>

      {/* Upload File */}
      <Modal show={modal === 'upload'} onClose={closeModal} title="Upload File">
        <form onSubmit={handleFileUpload} className="space-y-4">
          <WsSelect
            value={uploadForm.workspace_id}
            workspaces={workspaces}
            onChange={(e) => setUploadForm(p => ({ ...p, workspace_id: e.target.value }))}
          />
          <Field label="File">
            <div
              onClick={() => document.getElementById('file-input').click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                uploadForm.file
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40'
              }`}
            >
              <div className="text-3xl mb-2">{uploadForm.file ? '📄' : '📁'}</div>
              <p className="text-sm font-medium text-gray-700">
                {uploadForm.file ? uploadForm.file.name : 'Click to select a file'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {uploadForm.file
                  ? `${(uploadForm.file.size / 1024).toFixed(1)} KB`
                  : 'PDF, images, docs — max 10MB'}
              </p>
              <input
                id="file-input"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                onChange={(e) => {
                  const f = e.target.files[0]
                  if (f && f.size > 10 * 1024 * 1024) {
                    toast.error('File must be under 10MB')
                    return
                  }
                  setUploadForm(p => ({ ...p, file: f || null }))
                }}
              />
            </div>
          </Field>
          {uploadForm.file && (
            <button
              type="button"
              onClick={() => setUploadForm(p => ({ ...p, file: null }))}
              className="text-xs text-red-400 hover:text-red-600"
            >
              ✕ Remove file
            </button>
          )}
          <div className="flex gap-2 pt-1">
            <GradientBtn loading={submitting} label="Upload File" />
            <CancelBtn onClick={closeModal} />
          </div>
        </form>
      </Modal>
    </div>
  )
}

// At the bottom of src/pages/WorkspaceHomePage.jsx
export default WorkspaceHomePage;