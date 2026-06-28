import { useState, useEffect, useContext } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { getTasks } from '../service/taskService'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  todo: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-amber-100 text-amber-700',
  done: 'bg-green-100 text-green-700',
}

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-600',
  medium: 'bg-yellow-100 text-yellow-600',
  low: 'bg-gray-100 text-gray-500',
}

function MyTasksPage() {
  const { user } = useContext(AuthContext)
  const { workspaces } = useOutletContext()
  const navigate = useNavigate()

  const [allTasks, setAllTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      try {
        const results = await Promise.all(
          workspaces.map(ws => getTasks(ws.id).then(r => r.data.tasks))
        )
        const flat = results.flat()
        setAllTasks(flat)
      } catch {
        toast.error('Failed to load tasks')
      } finally {
        setLoading(false)
      }
    }
    if (workspaces.length > 0) {
      load()
    } 
    
  }, [workspaces])

  const filtered = filter === 'all'
    ? allTasks
    : allTasks.filter(t => t.status === filter)

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-sm text-gray-400 mt-0.5">All tasks across your workspaces</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-white rounded-xl p-1 shadow-sm w-fit border border-gray-100">
        {[
          { key: 'all', label: 'All' },
          { key: 'todo', label: 'Todo' },
          { key: 'in_progress', label: 'In Progress' },
          { key: 'done', label: 'Done' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading tasks...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-500 font-medium">No tasks found</p>
          <p className="text-gray-400 text-sm mt-1">
            {workspaces.length === 0
              ? 'Create a workspace and add tasks'
              : 'All clear! Create tasks inside a workspace'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <div
              key={task.id}
              className="bg-white rounded-xl border border-gray-100 p-4 hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                  <input
                    type="checkbox"
                    checked={task.status === 'done'}
                    readOnly
                    className="w-4 h-4 accent-indigo-600 shrink-0"
                  />
                  <div className="overflow-hidden">
                    <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{task.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority] || 'bg-gray-100 text-gray-500'}`}>
                    {task.priority}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-500'}`}>
                    {task.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyTasksPage