import { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { getWorkspace, inviteMember, removeMember } from '../service/workspaceService'
import { createTask, getTasks, updateTask, deleteTask } from '../service/taskService'
import api from '../service/api' // <-- Added this to handle the file upload API call
import toast from 'react-hot-toast'

const COLUMNS = [
  { id: 'todo', label: '📋 Todo', color: 'bg-indigo-50 border-indigo-200' },
  { id: 'in_progress', label: '⚡ In Progress', color: 'bg-orange-50 border-orange-200' },
  { id: 'done', label: '✅ Done', color: 'bg-green-50 border-green-200' },
]

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
}

function WorkspaceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)
  const { refreshWorkspaces } = useOutletContext()

  const [workspace, setWorkspace] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [activeTab, setActiveTab] = useState('tasks')

  const [taskForm, setTaskForm] = useState({
    title: '', description: '', priority: 'medium', assigned_to: ''
  })
  const [taskFile, setTaskFile] = useState(null) // <-- Added task file state
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' })
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    try {
      const [wsRes, tasksRes] = await Promise.all([
        getWorkspace(id),
        getTasks(id)
      ])
      setWorkspace(wsRes.data)
      setTasks(tasksRes.data.tasks)
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to load workspace'
      toast.error('detail')
      if (err.response?.status === 403 || err.response?.status === 404){
      navigate('/workspaces')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      await fetchData()
    }
    load()
  }, [id])

  // <-- Updated handleCreateTask to support file uploads
  const handleCreateTask = async (e) => {
    e.preventDefault()
    if (!taskForm.title.trim()) {
      toast.error('Task title is required')
      return
    }
    setSubmitting(true)
    try {
      let fileUrl = null
      
      // Upload file first if attached
      if (taskFile) {
        const formData = new FormData()
        formData.append('file', taskFile)
        formData.append('workspace_id', id)
        const fileRes = await api.post('/api/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        fileUrl = fileRes.data.url
      }

      const payload = {
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        assigned_to: taskForm.assigned_to || null,
        attachment_url: fileUrl // <-- Attach URL from upload
      }
      
      await createTask(id, payload)
      toast.success('Task created!')
      setTaskForm({ title: '', description: '', priority: 'medium', assigned_to: '' })
      setTaskFile(null) // <-- Reset the file state
      setShowTaskForm(false)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(id, taskId, { status: newStatus })
      setTasks(prev =>
        prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
      )
      toast.success('Task moved!')
    } catch {
      toast.error('Failed to update task')
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return
    try {
      await deleteTask(id, taskId)
      setTasks(prev => prev.filter(t => t.id !== taskId))
      toast.success('Task deleted!')
    } catch {
      toast.error('Failed to delete task')
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteForm.email.trim()) {
      toast.error('Email is required')
      return
    }
    setSubmitting(true)
    try {
      await inviteMember(id, inviteForm)
      toast.success('Member invited!')
      setInviteForm({ email: '', role: 'member' })
      setShowInviteForm(false)
      fetchData()
      refreshWorkspaces()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to invite member')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this member from the workspace?')) return
    try {
      await removeMember(id, memberId)
      toast.success('Member removed!')
      fetchData()
      refreshWorkspaces()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove member')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">Loading workspace...</p>
      </div>
    )
  }

  const tasksByStatus = (status) => tasks.filter(t => t.status === status)

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">

      {/* Workspace header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{workspace?.name}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {workspace?.description || 'No description'}
            </p>
            <div className="flex items-center gap-4 mt-3">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {workspace?.member_count} member{workspace?.member_count !== 1 ? 's' : ''}
              </span>
              <span className="text-xs text-gray-400">
                Created {workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString() : ''}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-2 rounded-lg"
            >
              + Invite
            </button>
            <button
              onClick={() => setShowTaskForm(prev => !prev)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-lg"
            >
             {showTaskForm ? 'Cancel' : '+ Add Task'}
            </button>
          </div>
        </div>

        {/* Invite form */}
        {showInviteForm && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="font-medium text-gray-700 mb-3 text-sm">Invite Team Member</h3>
            <form onSubmit={handleInvite} className="flex gap-3">
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="teammate@email.com"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:bg-blue-300"
              >
                {submitting ? 'Inviting...' : 'Invite'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm w-fit">
        {['tasks', 'members'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'tasks' ? '📋 Tasks' : '👥 Members'}
          </button>
        ))}
      </div>

      {/* TASKS TAB */}
      {activeTab === 'tasks' && (
        <>
          {showTaskForm && (
            <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
              <h3 className="font-semibold text-gray-800 mb-3">Create New Task</h3>
              <form onSubmit={handleCreateTask} className="space-y-3">
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Task title *"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex gap-3">
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none flex-1"
                  >
                    <option value="low">🟢 Low Priority</option>
                    <option value="medium">🟡 Medium Priority</option>
                    <option value="high">🔴 High Priority</option>
                  </select>
                  <select
                    value={taskForm.assigned_to}
                    onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none flex-1"
                  >
                    <option value="">Unassigned</option>
                    {workspace?.members?.map(m => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.user_id === user?.id ? 'Me' : m.user_id.slice(-6)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* --- ADDED ATTACHMENT UPLOAD UI --- */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attach File <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <div
                    onClick={() => document.getElementById('task-file-input').click()}
                    className={`border border-dashed rounded-lg px-4 py-3 text-center cursor-pointer text-sm transition-colors ${
                      taskFile ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-300 text-gray-400 hover:border-indigo-300'
                    }`}
                  >
                    {taskFile ? `📎 ${taskFile.name}` : '📎 Click to attach a file'}
                    <input
                      id="task-file-input"
                      type="file"
                      className="hidden"
                      onChange={(e) => setTaskFile(e.target.files[0] || null)}
                    />
                  </div>
                  {taskFile && (
                    <button
                      type="button"
                      onClick={() => setTaskFile(null)}
                      className="text-xs text-red-400 hover:text-red-600 mt-1"
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>
                {/* ---------------------------------- */}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2 rounded-lg text-sm font-medium"
                  >
                    {submitting ? 'Creating...' : 'Create Task'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTaskForm(false)}
                    className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map(col => (
              <div key={col.id} className={`rounded-xl border-2 p-4 ${col.color}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700 text-sm">{col.label}</h3>
                  <span className="text-xs bg-white px-2 py-0.5 rounded-full text-gray-500 border">
                    {tasksByStatus(col.id).length}
                  </span>
                </div>

                <div className="space-y-2 min-h-16">
                  {tasksByStatus(col.id).length === 0 ? (
                    <div className="text-center py-6 text-gray-300 text-xs">
                      No tasks here
                    </div>
                  ) : (
                    tasksByStatus(col.id).map(task => (
                      <div
                        key={task.id}
                        className="bg-white rounded-lg p-3 shadow-sm border border-gray-100"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-gray-800 text-sm flex-1">
                            {task.title}
                          </h4>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-gray-300 hover:text-red-400 text-xs shrink-0"
                          >
                            ✕
                          </button>
                        </div>

                        {task.description && (
                          <p className="text-gray-400 text-xs mt-1">{task.description}</p>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority}
                          </span>
                        </div>

                        <div className="flex gap-1 mt-2">
                          {COLUMNS.filter(c => c.id !== col.id).map(c => (
                            <button
                              key={c.id}
                              onClick={() => handleStatusChange(task.id, c.id)}
                              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-500 px-2 py-1 rounded flex-1"
                            >
                              → {c.id === 'todo' ? 'Todo' : c.id === 'in_progress' ? 'In Progress' : 'Done'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* MEMBERS TAB */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            Team Members ({workspace?.member_count})
          </h3>
          <div className="space-y-3">
            {workspace?.members?.map((member, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700">
                    {member.user_id === user?.id ? user?.name?.[0]?.toUpperCase() : '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {member.user_id === user?.id ? `${user?.name} (You)` : member.user_id.slice(-8)}
                    </p>
                    <p className="text-xs text-gray-400">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    member.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : member.role === 'viewer'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {member.role}
                  </span>
                  {member.user_id !== user?.id && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkspaceDetailPage