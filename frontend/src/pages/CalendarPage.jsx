import { useState, useEffect, useContext } from 'react'
import { useOutletContext } from 'react-router-dom'
import { getTasks } from '../service/taskService'
import toast from 'react-hot-toast'

function CalendarPage() {
  const { workspaces } = useOutletContext()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    const load = async () => {
      try {
        const results = await Promise.all(
          workspaces.map(ws => getTasks(ws.id).then(r => r.data.tasks))
        )
        const flat = results.flat().filter(t => t.deadline)
        setTasks(flat)
      } catch {
        toast.error('Failed to load tasks')
      } finally {
        setLoading(false)
      }
    }
    if (workspaces.length > 0) load()
    else setLoading(false)
  }, [workspaces])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const getTasksForDay = (day) => {
    return tasks.filter(t => {
      if (!t.deadline) return false
      const d = new Date(t.deadline)
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
    })
  }

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-400 mt-0.5">Task deadlines and schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-32 text-center">{monthName}</span>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm"
          >
            ›
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Day labels */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-3 text-center text-xs font-semibold text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
            const dayTasks = day ? getTasksForDay(day) : []
            return (
              <div
                key={i}
                className={`min-h-20 p-2 border-b border-r border-gray-50 ${!day ? 'bg-gray-50/50' : 'hover:bg-indigo-50/30 transition-colors'}`}
              >
                {day && (
                  <>
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${
                      isToday
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-700'
                    }`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, 2).map(t => (
                        <div
                          key={t.id}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 truncate"
                          title={t.title}
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-[10px] text-gray-400 px-1">+{dayTasks.length - 2} more</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {tasks.length === 0 && !loading && (
        <div className="text-center mt-6 text-sm text-gray-400">
          No tasks with deadlines found. Add deadlines to your tasks to see them here.
        </div>
      )}
    </div>
  )
}

export default CalendarPage