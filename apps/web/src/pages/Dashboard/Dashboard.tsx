

import { useEffect, useState } from 'react'
import DashboardHeader from '../../components/dashboard/DashboardHeader'
import GoalProgress from '../../components/dashboard/GoalProgress'
import StatCard from '../../components/dashboard/StatCard'
import TodayTasks from '../../components/dashboard/TodayTasks'
import WeeklyActivity from '../../components/dashboard/WeeklyActivity'

type Goal = {
  _id: string
  status: 'active' | 'completed' | 'paused'
}

type Task = {
  _id: string
  title: string
  status: 'pending' | 'completed'
  dueDate?: string | null
  completedAt?: string | null
}

type ApiResponse<T> = {
  success: boolean
  data?: T
  message?: string
}

const API_URL = 'http://localhost:5000/api'
const TASKS_UPDATED_EVENT = 'consistencyos:tasks-updated'

function getLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)

  return new Date(year, month - 1, day, 12, 0, 0)
}

function Dashboard() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadDashboardData() {
      try {
        const [goalsResponse, tasksResponse] = await Promise.all([
          fetch(`${API_URL}/goals`),
          fetch(`${API_URL}/tasks`),
        ])

        const goalsResult: ApiResponse<Goal[]> = await goalsResponse.json()
        const tasksResult: ApiResponse<Task[]> = await tasksResponse.json()

        if (!goalsResponse.ok || !goalsResult.success) {
          throw new Error(goalsResult.message || 'Unable to load goals')
        }

        if (!tasksResponse.ok || !tasksResult.success) {
          throw new Error(tasksResult.message || 'Unable to load tasks')
        }

        if (!cancelled) {
          setGoals(goalsResult.data ?? [])
          setTasks(tasksResult.data ?? [])
          setError('')
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load dashboard data',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    window.addEventListener(TASKS_UPDATED_EVENT, loadDashboardData)
    void loadDashboardData()

    return () => {
      cancelled = true
      window.removeEventListener(TASKS_UPDATED_EVENT, loadDashboardData)
    }
  }, [])

  // Basic task statistics
  const activeGoals = goals.filter(
    (goal) => goal.status === 'active',
  ).length

  const completedTasks = tasks.filter(
    (task) => task.status === 'completed',
  ).length

  const pendingTasks = tasks.filter(
    (task) => task.status === 'pending',
  ).length

  // Consistency score
  const consistencyScore =
    tasks.length === 0
      ? 0
      : Math.round((completedTasks / tasks.length) * 100)

  // Today's task progress
  const todayKey = getLocalDateKey(new Date())

  const tasksDueToday = tasks.filter(
    (task) =>
      task.dueDate &&
      task.dueDate.slice(0, 10) === todayKey,
  )

  const tasksCompletedToday = tasksDueToday.filter(
    (task) => task.status === 'completed',
  ).length

  const todayProgress = `${tasksCompletedToday}/${tasksDueToday.length}`

  // Build a set of calendar days on which tasks were completed.
  const completedDateKeys = new Set(
    tasks
      .filter(
        (task) =>
          task.status === 'completed' &&
          task.completedAt &&
          !Number.isNaN(new Date(task.completedAt).getTime()),
      )
      .map((task) => getLocalDateKey(new Date(task.completedAt!))),
  )

  // Current streak: today, or yesterday if today has no completion yet.
  const currentDate = new Date()
  currentDate.setHours(12, 0, 0, 0)

  if (!completedDateKeys.has(getLocalDateKey(currentDate))) {
    currentDate.setDate(currentDate.getDate() - 1)
  }

  let currentStreak = 0

  while (completedDateKeys.has(getLocalDateKey(currentDate))) {
    currentStreak++
    currentDate.setDate(currentDate.getDate() - 1)
  }

  // Best streak: longest consecutive sequence of completion dates.
  const sortedDates = Array.from(completedDateKeys).sort()

  let bestStreak = 0
  let runningStreak = 0
  let previousDate: Date | null = null

  for (const dateKey of sortedDates) {
    const current = getDateFromKey(dateKey)

    if (previousDate) {
      const difference =
        (current.getTime() - previousDate.getTime()) /
        (1000 * 60 * 60 * 24)

      runningStreak = difference === 1 ? runningStreak + 1 : 1
    } else {
      runningStreak = 1
    }

    bestStreak = Math.max(bestStreak, runningStreak)
    previousDate = current
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <DashboardHeader />

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {loading && (
        <p className="mb-6 text-sm text-slate-500">
          Loading your latest goals and tasks...
        </p>
      )}

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Consistency Score"
          value={loading ? '—' : String(consistencyScore)}
          suffix="/ 100"
          description="Percentage of all tasks completed."
        />

        <StatCard
          label="Today's Progress"
          value={loading ? '—' : todayProgress}
          description="Tasks due today that are completed."
        />

        <StatCard
          label="Current Streak"
          value={loading ? '—' : String(currentStreak)}
          suffix="days"
          description="Consecutive days with completed tasks."
        />

        <StatCard
          label="Best Streak"
          value={loading ? '—' : String(bestStreak)}
          suffix="days"
          description="Your longest completion streak."
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <TodayTasks />
        <GoalProgress />
      </section>

      <section className="mt-8">
        <WeeklyActivity />
      </section>

      {!loading && !error && (
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Active goals</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {activeGoals}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Pending tasks</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {pendingTasks}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Completed tasks</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {completedTasks}
            </p>
          </div>
        </section>
      )}
    </div>
  )
}

export default Dashboard

