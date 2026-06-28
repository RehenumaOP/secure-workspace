import { useState, useEffect, useContext } from 'react'
import { Outlet, useNavigate, useParams, Link, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { getMyWorkspaces, createWorkspace } from '../service/workspaceService'
import toast from 'react-hot-toast'

// ── Icons ──────────────────────────────────────────────────
function HomeIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>
}
function TaskIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>
}
function CalendarIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
}
function SettingsIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}
function LockIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
}
function CollapseIcon({ collapsed }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{collapsed ? <path d="M9 18l6-6-6-6"/> : <path d="M15 18l-6-6 6-6"/>}</svg>
}

const NAV_ITEMS = [
  { icon: HomeIcon,     label: 'Home',     path: '/workspaces' },
  { icon: TaskIcon,     label: 'My Tasks', path: '/my-tasks'   },
  { icon: CalendarIcon, label: 'Calendar', path: '/calendar'   },
  { icon: SettingsIcon, label: 'Settings', path: '/settings'   },
]

// ── Sidebar button style helper ────────────────────────────
function navStyle(active) {
  return {
    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 12px 9px 14px', borderRadius: 8, border: 'none',
    cursor: 'pointer', fontSize: 13, fontWeight: active ? 500 : 400,
    background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
    color: active ? '#ffffff' : '#64748b', transition: 'all 0.12s',
  }
}

// ── Main Layout ────────────────────────────────────────────
function Layout() {
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()
  const { id: activeWorkspaceId } = useParams()

  // ── State ─────────────────────────────────────────────────
  const [workspaces, setWorkspaces]           = useState([])
  const [loading, setLoading]                 = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUserMenu, setShowUserMenu]       = useState(false)
  const [form, setForm]                       = useState({ name: '', description: '' })
  const [creating, setCreating]               = useState(false)
  const [collapsed, setCollapsed]             = useState(false)

  // ── Fetch workspaces ──────────────────────────────────────
  const fetchWorkspaces = async () => {
    try {
      const res = await getMyWorkspaces()
      // Defensive: ensure we always have an array
      setWorkspaces(Array.isArray(res.data.workspaces) ? res.data.workspaces : [])
    } catch {
      toast.error('Failed to load workspaces')
      setWorkspaces([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const load = async () => { await fetchWorkspaces() }
    load()
  }, [])

  // ── Create workspace ──────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setCreating(true)
    try {
      const res = await createWorkspace(form)

      // ── THE FIX: backend returns { workspace: { id, name... } }
      // res.data.workspace.id is the correct field
      const newId = res.data?.workspace?.id
      if (!newId) {
        throw new Error('Server did not return workspace id')
      }

      toast.success('Workspace created!')
      setForm({ name: '', description: '' })
      setShowCreateModal(false)
      await fetchWorkspaces()
      navigate(`/workspaces/${newId}`)   // ← never undefined now
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to create workspace')
    } finally {
      setCreating(false)
    }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  // ── Active detection ──────────────────────────────────────
  const isNavActive = (path) => {
    if (path === '/workspaces') {
      // Home is active only when on /workspaces with no workspace selected
      return location.pathname === '/workspaces' && !activeWorkspaceId
    }
    return location.pathname === path
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-[#f1f5f9]">

      {/* ══ SIDEBAR ══ */}
      <aside
        style={{ background: '#0f172a' }}
        className={`${collapsed ? 'w-[60px]' : 'w-[220px]'} flex flex-col shrink-0 transition-all duration-200 overflow-hidden`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-5">
          <div style={{ color: '#6366f1' }} className="shrink-0">
            <LockIcon size={20} />
          </div>
          {!collapsed && (
            <div className="leading-none">
              <span style={{ color: '#ffffff', fontWeight: 700, fontSize: 14 }}>Secure</span>
              <span style={{ color: '#94a3b8', fontWeight: 300, fontSize: 14 }}>Work</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="px-2 space-y-0.5">
          {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
            const active = isNavActive(path)
            return (
              <div key={label} className="relative">
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                    style={{ width: 3, height: 20, background: '#6366f1' }} />
                )}
                <button
                  onClick={() => navigate(path)}
                  title={collapsed ? label : ''}
                  style={navStyle(active)}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#f8fafc' } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' } }}
                >
                  <Icon size={16} />
                  {!collapsed && <span>{label}</span>}
                </button>
              </div>
            )
          })}
        </nav>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 16px' }} />

        {/* Workspaces list */}
        <div className="flex-1 overflow-y-auto px-2">
          {!collapsed && (
            <p style={{ color: '#334155', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, padding: '0 10px 6px' }}>
              Workspaces
            </p>
          )}

          {loading ? (
            !collapsed && <p style={{ color: '#475569', fontSize: 12, padding: '4px 10px' }}>Loading...</p>
          ) : (
            <div className="space-y-0.5">
              {workspaces.map((ws) => {
                const wsActive = activeWorkspaceId === ws.id
                return (
                  <div key={ws.id} className="relative">
                    {wsActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                        style={{ width: 3, height: 20, background: '#6366f1' }} />
                    )}
                    <Link
                      to={`/workspaces/${ws.id}`}
                      title={collapsed ? ws.name : ''}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9,
                        padding: collapsed ? '8px 12px' : '8px 10px 8px 14px',
                        borderRadius: 8, textDecoration: 'none',
                        background: wsActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: wsActive ? '#ffffff' : '#64748b',
                        fontSize: 13, fontWeight: wsActive ? 500 : 400,
                        transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { if (!wsActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#f8fafc' } }}
                      onMouseLeave={e => { if (!wsActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' } }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        background: wsActive ? '#4f46e5' : 'rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700,
                        color: wsActive ? '#fff' : '#64748b',
                      }}>
                        {ws.name[0].toUpperCase()}
                      </div>
                      {!collapsed && (
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ws.name}
                        </span>
                      )}
                    </Link>
                  </div>
                )
              })}

              {/* New workspace button */}
              <button
                onClick={() => setShowCreateModal(true)}
                title={collapsed ? 'New Workspace' : ''}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                  padding: collapsed ? '8px 12px' : '8px 10px 8px 14px',
                  borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'transparent', color: '#475569', fontSize: 13,
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#f8fafc' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569' }}
              >
                <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: '1px dashed #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#475569' }}>
                  +
                </div>
                {!collapsed && <span>New Workspace</span>}
              </button>
            </div>
          )}
        </div>

        {/* User section */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 8px' }} className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: showUserMenu ? 'rgba(255,255,255,0.06)' : 'transparent', transition: 'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            onMouseLeave={e => { e.currentTarget.style.background = showUserMenu ? 'rgba(255,255,255,0.06)' : 'transparent' }}
          >
            <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            {!collapsed && (
              <>
                <div style={{ flex: 1, overflow: 'hidden', textAlign: 'left' }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
                  <p style={{ fontSize: 10, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
              </>
            )}
          </button>

          {showUserMenu && (
            <div style={{ position: 'absolute', bottom: 60, left: 8, right: 8, background: '#fff', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', overflow: 'hidden', border: '1px solid #f1f5f9', zIndex: 50 }}>
              <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #f8fafc' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{user?.name}</p>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '8px' }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand' : 'Collapse'}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-end', padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#334155', transition: 'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#334155' }}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        </div>
      </aside>

      {/* ══ MAIN AREA ══ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header style={{ background: '#ffffff', borderBottom: '1px solid #f1f5f9' }}
          className="px-6 py-3 flex items-center justify-between shrink-0">
          <div>
            {activeWorkspaceId ? (
              <div className="flex items-center gap-2" style={{ color: '#94a3b8', fontSize: 13 }}>
                <button onClick={() => navigate('/workspaces')}
                  style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
                  onMouseEnter={e => e.currentTarget.style.color = '#4f46e5'}
                  onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
                  Home
                </button>
                <span style={{ color: '#e2e8f0' }}>/</span>
                <span style={{ color: '#1e293b', fontWeight: 500, fontSize: 13 }}>
                  {workspaces.find(w => w.id === activeWorkspaceId)?.name || 'Workspace'}
                </span>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#94a3b8' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 12px rgba(99,102,241,0.35)', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.5)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(99,102,241,0.35)'}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New Workspace
          </button>
        </header>

        {/* Page content via Outlet */}
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ workspaces, refreshWorkspaces: fetchWorkspaces }} />
        </main>
      </div>

      {/* ══ CREATE MODAL ══ */}
      {showCreateModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
          onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
        >
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Create Workspace</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18 }}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 6 }}>Workspace name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Product Team"
                  autoFocus
                  style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#0f172a' }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#475569', marginBottom: 6 }}>
                  Description <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What does this workspace do?"
                  rows={3}
                  style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box', color: '#0f172a' }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  disabled={creating}
                  style={{ flex: 1, background: creating ? '#a5b4fc' : 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 14, fontWeight: 500, cursor: creating ? 'default' : 'pointer', transition: 'all 0.15s' }}
                >
                  {creating ? 'Creating...' : 'Create Workspace'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '11px 20px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#64748b', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Layout