

import { useCallback, useEffect, useState } from 'react'

type Task = {
  _id: string
  title: string
  status: 'pending' | 'completed'
  completedAt?: string | null
}

type ApiResponse<T> = {
  success: boolean
  data?: T
  message?: string
}

type DailyActivity = {
  key: string
  day: string
  date: string
  count: number
}

const API_URL = 'http://localhost:5000/api'
const TASKS_UPDATED_EVENT = 'consistencyos:tasks-updated'

function getDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function WeeklyActivity() {
  const [weeklyData, setWeeklyData] = useState<DailyActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchWeeklyActivity = useCallback(async () => {
    const response = await fetch(`${API_URL}/tasks`)
    const result: ApiResponse<Task[]> = await response.json()

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Unable to load weekly activity')
    }

    const tasks = result.data ?? []
    const today = new Date()
    const days: DailyActivity[] = []

    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(today)
      date.setHours(12, 0, 0, 0)
      date.setDate(date.getDate() - offset)

      const key = getDateKey(date)

      const count = tasks.filter((task) => {
        if (task.status !== 'completed' || !task.completedAt) {
          return false
        }

        const completedDate = new Date(task.completedAt)

        if (Number.isNaN(completedDate.getTime())) {
          return false
        }

        return getDateKey(completedDate) === key
      }).length

      days.push({
        key,
        day: date.toLocaleDateString('en-IN', {
          weekday: 'short',
        }),
        date: date.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        }),
        count,
      })
    }

    setWeeklyData(days)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadActivity() {
      try {
        await fetchWeeklyActivity()

        if (!cancelled) {
          setError('')
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load weekly activity',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    const handleTasksUpdated = () => {
      void loadActivity()
    }

    window.addEventListener(TASKS_UPDATED_EVENT, handleTasksUpdated)
    void loadActivity()

    return () => {
      cancelled = true
      window.removeEventListener(TASKS_UPDATED_EVENT, handleTasksUpdated)
    }
  }, [fetchWeeklyActivity])

  const maxCount = Math.max(
    1,
    ...weeklyData.map((item) => item.count),
  )

  const totalCompleted = weeklyData.reduce(
    (total, item) => total + item.count,
    0,
  )

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Weekly Activity
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Tasks completed over the last seven days.
          </p>
        </div>

        {!loading && !error && (
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">
              {totalCompleted}
            </p>
            <p className="text-xs text-slate-500">
              completed this week
            </p>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-5 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">
          Loading weekly activity...
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-7 gap-2 sm:gap-3">
            {weeklyData.map((item) => {
              const height =
                item.count === 0
                  ? 0
                  : Math.max(8, (item.count / maxCount) * 100)

              return (
                <div key={item.key} className="min-w-0 text-center">
                  <div className="flex h-32 items-end justify-center">
                    <div
                      title={`${item.count} task${item.count === 1 ? '' : 's'} completed on ${item.date}`}
                      className="w-full max-w-8 rounded-t-md bg-slate-900 transition-all duration-300"
                      style={{ height: `${height}%` }}
                    />
                  </div>

                  <p className="mt-2 text-xs font-semibold text-slate-700">
                    {item.count}
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {item.day}
                  </p>

                  <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">
                    {item.date}
                  </p>
                </div>
              )
            })}
          </div>

          {totalCompleted === 0 && (
            <p className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              No completed tasks were recorded in the last seven days.
              Complete a task to start building your activity history.
            </p>
          )}

          <p className="mt-4 text-xs text-slate-400">
            Bars are scaled relative to your busiest day in this seven-day period.
          </p>
        </>
      )}
    </section>
  )
}

export default WeeklyActivity

