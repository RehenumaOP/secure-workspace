import useAuth from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔐</span>
          <span className="font-bold text-gray-800">Secure Workspace</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Hello, {user?.name}!</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Logout
          </button>
          <button
            onClick={() => navigate('/workspaces')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium mt-4"
         >
          Go to Workspaces →
         </button>
        </div>
      </nav>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome, {user?.name}!
          </h1>
          <p className="text-gray-500 mb-6">
            You are successfully logged in. Phase 2 is complete!
          </p>

          {/* User info card */}
          <div className="bg-gray-50 rounded-xl p-6 text-left max-w-sm mx-auto">
            <h3 className="font-semibold text-gray-700 mb-3">Your Account</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="font-medium">{user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Role</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            More features coming in the next phases!
          </p>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage