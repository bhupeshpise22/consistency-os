
import { useEffect, useState } from 'react'

type Goal = {
  _id: string
  title: string
  status: 'active' | 'completed' | 'paused'
  progress: number
  remainingTasks: number
}

type ApiResponse<T> = {
  success: boolean
  data?: T
  message?: string
}

const API_URL = 'http://localhost:5000/api'

function GoalProgress() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function fetchGoals() {
      try {
        const response = await fetch(`${API_URL}/goals`)
        const result: ApiResponse<Goal[]> = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to load goals')
        }

        if (!cancelled) {
          setGoals(result.data ?? [])
          setError('')
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load goals',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchGoals()

    return () => {
      cancelled = true
    }
  }, [])

  const activeGoals = goals.filter((goal) => goal.status === 'active')

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Goal Progress
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Your active goals.
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading goals...</p>
      ) : activeGoals.length === 0 ? (
        <p className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
          No active goals yet. Create a goal to see your progress here.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {activeGoals.map((goal) => {
            const progress = Math.min(
              100,
              Math.max(0, Number(goal.progress) || 0),
            )

            return (
              <div key={goal._id}>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-slate-700">
                    {goal.title}
                  </span>

                  <span className="shrink-0 text-sm text-slate-500">
                    {progress}%
                  </span>
                </div>

                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label={`${goal.title} progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  {goal.remainingTasks} remaining{' '}
                  {goal.remainingTasks === 1 ? 'task' : 'tasks'}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default GoalProgress
