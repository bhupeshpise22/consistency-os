


import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'

type ApiGoal = {
  _id: string
  title: string
  status: 'active' | 'completed' | 'paused'
}

type ApiTask = {
  _id: string
  title: string
  description?: string
  status: 'pending' | 'completed'
  priority: 'low' | 'medium' | 'high'
  dueDate?: string | null
  completedAt?: string | null
  goalId: string | { _id: string; title: string }
  createdAt?: string
}

type ApiResponse<T> = {
  success: boolean
  data?: T
  message?: string
}

const API_URL = 'http://localhost:5000/api'

function Tasks() {
  const [tasks, setTasks] = useState<ApiTask[]>([])
  const [goals, setGoals] = useState<ApiGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const fetchTasks = useCallback(async () => {
    const response = await fetch(`${API_URL}/tasks`)
    const result: ApiResponse<ApiTask[]> = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Unable to load tasks')
    }

    setTasks(result.data ?? [])
  }, [])

  const fetchGoals = useCallback(async () => {
    const response = await fetch(`${API_URL}/goals`)
    const result: ApiResponse<ApiGoal[]> = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Unable to load goals')
    }

    setGoals(result.data ?? [])
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      await Promise.all([fetchTasks(), fetchGoals()])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while loading data',
      )
    } finally {
      setLoading(false)
    }
  }, [fetchTasks, fetchGoals])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')

    const form = event.currentTarget
    const formData = new FormData(form)

    const payload = {
      title: String(formData.get('title') ?? '').trim(),
      description: String(formData.get('description') ?? '').trim(),
      goalId: String(formData.get('goalId') ?? ''),
      priority: String(formData.get('priority') ?? 'medium'),
      dueDate: String(formData.get('dueDate') ?? '') || null,
    }

    setSaving(true)

    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result: ApiResponse<ApiTask> = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to create task')
      }

      form.reset()
      await fetchTasks()
      setNotice('Task created successfully.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to create task',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    setError('')
    setNotice('')
    setCompletingTaskId(taskId)

    try {
      const response = await fetch(
        `${API_URL}/tasks/${taskId}/complete`,
        { method: 'PATCH' },
      )

      const result: ApiResponse<{
        task: ApiTask
        progress: number
        remainingTasks: number
      }> = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to complete task')
      }

      await Promise.all([fetchTasks(), fetchGoals()])
      setNotice('Task completed! Your goal progress has been updated.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to complete task',
      )
    } finally {
      setCompletingTaskId(null)
    }
  }

  const getGoalTitle = (goalId: ApiTask['goalId']) => {
    if (typeof goalId === 'object' && goalId !== null) {
      return goalId.title
    }

    return goals.find((goal) => goal._id === goalId)?.title ?? 'Goal'
  }

  const formatDate = (date?: string | null) => {
    if (!date) return 'No due date'

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) return 'No due date'

    return parsedDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <section className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Daily execution
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Tasks
          </h1>
          <p className="mt-2 text-slate-600">
            Turn your goals into manageable actions and track your progress.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {notice}
          </div>
        )}

        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold text-slate-900">
            Create a task
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Every task must belong to one of your goals.
          </p>

          {goals.filter((goal) => goal.status === 'active').length === 0 ? (
            <p className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              Create an active goal on the Goals page before adding a task.
            </p>
          ) : (
            <form onSubmit={handleCreateTask} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="task-title"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Task title
                </label>
                <input
                  id="task-title"
                  name="title"
                  type="text"
                  minLength={3}
                  maxLength={150}
                  placeholder="e.g. Solve two Java problems"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label
                  htmlFor="task-description"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Description (optional)
                </label>
                <textarea
                  id="task-description"
                  name="description"
                  maxLength={500}
                  rows={3}
                  placeholder="Add details about this task..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label
                    htmlFor="task-goal"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Linked goal
                  </label>
                  <select
                    id="task-goal"
                    name="goalId"
                    required
                    defaultValue=""
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-indigo-500"
                  >
                    <option value="" disabled>
                      Select a goal
                    </option>
                    {goals
                      .filter((goal) => goal.status === 'active')
                      .map((goal) => (
                        <option key={goal._id} value={goal._id}>
                          {goal.title}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="task-priority"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Priority
                  </label>
                  <select
                    id="task-priority"
                    name="priority"
                    defaultValue="medium"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="task-due-date"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Due date
                  </label>
                  <input
                    id="task-due-date"
                    name="dueDate"
                    type="date"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Creating task...' : 'Create Task'}
              </button>
            </form>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-900">
            Your tasks
          </h2>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700">
            {tasks.filter((task) => task.status === 'pending').length} pending
          </span>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h3 className="font-semibold text-slate-800">
              No tasks yet
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Create your first task above to start tracking your execution.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <article
                key={task._id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`text-lg font-semibold ${
                          task.status === 'completed'
                            ? 'text-slate-400 line-through'
                            : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          task.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {task.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </div>

                    {task.description && (
                      <p className="mt-2 text-sm text-slate-600">
                        {task.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                      <span>
                        Goal: {getGoalTitle(task.goalId)}
                      </span>
                      <span>
                        Priority:{' '}
                        <span className="font-medium capitalize text-slate-700">
                          {task.priority}
                        </span>
                      </span>
                      <span>Due: {formatDate(task.dueDate)}</span>
                    </div>
                  </div>

                  {task.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => void handleCompleteTask(task._id)}
                      disabled={completingTaskId === task._id}
                      className="shrink-0 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {completingTaskId === task._id
                        ? 'Completing...'
                        : 'Complete Task'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default Tasks

