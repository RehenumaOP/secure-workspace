import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import api from '../service/api'
import toast from 'react-hot-toast'

function SecurityPage() {
  const { user } = useContext(AuthContext)
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [logsRes, statsRes] = await Promise.all([
          api.get('/api/security/logs'),
          api.get('/api/security/stats'),
        ])
        setLogs(logsRes.data.logs)
        setStats(statsRes.data)
      } catch {
        toast.error('Failed to load security data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    } catch { return iso }
  }

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Security Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Monitor your account activity and login history</p>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Logins', value: stats.total_logins, icon: '🔑', color: 'from-indigo-500 to-purple-600' },
            { label: 'Failed Attempts', value: stats.failed_attempts, icon: '⚠️', color: 'from-red-400 to-rose-500' },
            { label: 'Success Rate', value: `${stats.success_rate}%`, icon: '✅', color: 'from-emerald-400 to-teal-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br- ${s.color} flex items-center justify-center text-lg mb-3`}>
                {s.icon}
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Security score */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4">Security Score</h2>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="3"/>
              <circle cx="18" cy="18" r="15" fill="none" stroke="#4f46e5" strokeWidth="3"
                strokeDasharray={`${0.7 * 94.2} 94.2`} strokeLinecap="round"/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-indigo-600">70</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-800 mb-2">Good — room to improve</p>
            <div className="space-y-1.5">
              {[
                { label: 'Strong Password', points: '+20', done: true },
                { label: '2FA Enabled', points: '+30', done: false },
                { label: 'No suspicious logins', points: '+20', done: true },
                { label: 'Recent password change', points: '+10', done: false },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${item.done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {item.done ? '✓' : '○'}
                  </span>
                  <span className={`text-xs ${item.done ? 'text-gray-700' : 'text-gray-400'}`}>{item.label}</span>
                  <span className={`text-xs ml-auto font-medium ${item.done ? 'text-green-600' : 'text-gray-300'}`}>{item.points}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Login history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Login History</h2>
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">🔒</div>
            <p className="text-gray-500 text-sm">No login history yet</p>
            <p className="text-gray-400 text-xs mt-1">Your login events will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={log.id || i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    log.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {log.status === 'success' ? '✓' : '✗'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 capitalize">{log.action}</p>
                    <p className="text-xs text-gray-400">{log.ip_address} · {log.device} · {log.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{formatTime(log.time)}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    log.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SecurityPage