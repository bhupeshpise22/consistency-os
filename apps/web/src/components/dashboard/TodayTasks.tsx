
import { useCallback, useEffect, useState } from 'react'

type Task = {
  _id: string
  title: string
  status: 'pending' | 'completed'
  dueDate?: string | null
  goalId?: string | { _id: string; title: string }
}

type ApiResponse<T> = {
  success: boolean
  data?: T
  message?: string
}

const API_URL = 'http://localhost:5000/api'
const TASKS_UPDATED_EVENT = 'consistencyos:tasks-updated'

function getTodayKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function TodayTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completingId, setCompletingId] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    const response = await fetch(`${API_URL}/tasks`)
    const result: ApiResponse<Task[]> = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to load tasks')
    }

    setTasks(result.data ?? [])
  }, [])

  // Load tasks initially and refresh when another component updates them.
  useEffect(() => {
    let cancelled = false

    const loadTasks = async () => {
      try {
        await fetchTasks()

        if (!cancelled) {
          setError('')
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load tasks',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    const handleTasksUpdated = () => {
      void loadTasks()
    }

    window.addEventListener(TASKS_UPDATED_EVENT, handleTasksUpdated)
    void loadTasks()

    return () => {
      cancelled = true
      window.removeEventListener(TASKS_UPDATED_EVENT, handleTasksUpdated)
    }
  }, [fetchTasks])

  const todayKey = getTodayKey()

  const todayTasks = tasks.filter(
    (task) => task.dueDate && task.dueDate.slice(0, 10) === todayKey,
  )

  const completedCount = todayTasks.filter(
    (task) => task.status === 'completed',
  ).length

  const handleToggleTask = async (task: Task, checked: boolean) => {
    if (!checked || task.status === 'completed') {
      return
    }

    setError('')
    setCompletingId(task._id)

    try {
      const response = await fetch(
        `${API_URL}/tasks/${task._id}/complete`,
        { method: 'PATCH' },
      )

      const result: ApiResponse<unknown> = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to complete task')
      }

      await fetchTasks()

      // Tell other dashboard components that task data has changed.
      window.dispatchEvent(new Event(TASKS_UPDATED_EVENT))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to complete task',
      )
    } finally {
      setCompletingId(null)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Today&apos;s Tasks
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Focus on what matters today.
          </p>
        </div>

        <span className="shrink-0 text-sm font-medium text-slate-500">
          {loading ? '…' : `${completedCount}/${todayTasks.length}`}
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading tasks...</p>
      ) : todayTasks.length === 0 ? (
        <div className="mt-6 rounded-lg bg-slate-50 p-4">
          <p className="text-sm text-slate-600">
            No tasks are due today.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Add a task with today&apos;s due date to see it here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {todayTasks.map((task) => (
            <label
              key={task._id}
              className="flex items-center gap-3 rounded-lg bg-slate-50 p-3"
            >
              <input
                type="checkbox"
                checked={task.status === 'completed'}
                disabled={
                  task.status === 'completed' ||
                  completingId === task._id
                }
                onChange={(event) =>
                  void handleToggleTask(task, event.target.checked)
                }
                className="h-4 w-4 accent-indigo-600"
              />

              <span
                className={`min-w-0 flex-1 text-sm ${
                  task.status === 'completed'
                    ? 'text-slate-500 line-through'
                    : 'text-slate-700'
                }`}
              >
                {task.title}
              </span>

              {completingId === task._id && (
                <span className="text-xs text-slate-500">
                  Saving...
                </span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default TodayTasks


