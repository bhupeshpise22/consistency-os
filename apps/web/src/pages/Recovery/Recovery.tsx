

import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  CheckCircle2,
  Clock,
  HeartHandshake,
  RefreshCw,
  ShieldCheck,
  Target,
  WandSparkles,
} from 'lucide-react'

type RecoverySession = {
  _id: string
  reason: string
  status: 'active' | 'completed'
  dailyTarget: number
  startDate: string
  endDate: string | null
}

type Goal = {
  _id: string
  title: string
  status: 'active' | 'completed' | 'paused'
}

type Task = {
  _id: string
  title: string
  status: 'pending' | 'completed'
  completedAt?: string | null
  recoverySessionId?: string | null
}

type ApiResponse<T> = {
  success: boolean
  data?: T | null
  message?: string
}

const API_URL = 'http://localhost:5000/api'
const TASKS_UPDATED_EVENT = 'consistencyos:tasks-updated'

function getDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDate(date: string) {
  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date unavailable'
  }

  return parsedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function Recovery() {
  const [session, setSession] = useState<RecoverySession | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([])
  const [generatedTasks, setGeneratedTasks] = useState<Task[]>([])

  const [reason, setReason] = useState('')
  const [dailyTarget, setDailyTarget] = useState('2')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Load recovery session, tasks and active goals.
  const loadData = useCallback(async () => {
    const [sessionResponse, tasksResponse, goalsResponse] =
      await Promise.all([
        fetch(`${API_URL}/recovery`),
        fetch(`${API_URL}/tasks`),
        fetch(`${API_URL}/goals`),
      ])

    const sessionResult: ApiResponse<RecoverySession> =
      await sessionResponse.json()

    const tasksResult: ApiResponse<Task[]> =
      await tasksResponse.json()

    const goalsResult: ApiResponse<Goal[]> =
      await goalsResponse.json()

    if (!sessionResponse.ok || !sessionResult.success) {
      throw new Error(
        sessionResult.message || 'Unable to load recovery session',
      )
    }

    if (!tasksResponse.ok || !tasksResult.success) {
      throw new Error(tasksResult.message || 'Unable to load tasks')
    }

    if (!goalsResponse.ok || !goalsResult.success) {
      throw new Error(goalsResult.message || 'Unable to load goals')
    }

    setSession(sessionResult.data ?? null)
    setTasks(tasksResult.data ?? [])

    setGoals(
      (goalsResult.data ?? []).filter(
        (goal) => goal.status === 'active',
      ),
    )
  }, [])

  // Initial loading and task update listener.
  useEffect(() => {
    let cancelled = false

    async function refreshData() {
      try {
        await loadData()

        if (!cancelled) {
          setError('')
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load recovery data',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    const handleTasksUpdated = () => {
      void refreshData()
    }

    window.addEventListener(
      TASKS_UPDATED_EVENT,
      handleTasksUpdated,
    )

    void refreshData()

    return () => {
      cancelled = true

      window.removeEventListener(
        TASKS_UPDATED_EVENT,
        handleTasksUpdated,
      )
    }
  }, [loadData])

  // Current local date.
  const todayKey = getDateKey(new Date())

  // Count only completed tasks belonging to this recovery session.
  const completedToday = tasks.filter((task) => {
    if (
      !session ||
      task.recoverySessionId !== session._id ||
      task.status !== 'completed' ||
      !task.completedAt
    ) {
      return false
    }

    const completedDate = new Date(task.completedAt)

    if (Number.isNaN(completedDate.getTime())) {
      return false
    }

    return getDateKey(completedDate) === todayKey
  }).length

  const target = session?.dailyTarget ?? 0

  const progressPercentage =
    target > 0
      ? Math.min(
          100,
          Math.round((completedToday / target) * 100),
        )
      : 0

  const remainingTasks = Math.max(
    0,
    target - completedToday,
  )

  // Select or deselect an active goal.
  const toggleGoal = (goalId: string) => {
    setSelectedGoalIds((current) =>
      current.includes(goalId)
        ? current.filter((id) => id !== goalId)
        : [...current, goalId],
    )
  }

  // Start a recovery session.
  const handleStartRecovery = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setError('')
    setNotice('')

    const targetValue = Number(dailyTarget)

    if (
      !Number.isInteger(targetValue) ||
      targetValue < 1 ||
      targetValue > 20
    ) {
      setError('Daily target must be between 1 and 20.')
      return
    }

    if (reason.trim().length < 3) {
      setError('Please enter at least 3 characters for your reason.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`${API_URL}/recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason.trim(),
          dailyTarget: targetValue,
        }),
      })

      const result: ApiResponse<RecoverySession> =
        await response.json()

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Unable to start recovery',
        )
      }

      await loadData()

      setReason('')
      setDailyTarget('2')
      setSelectedGoalIds([])
      setGeneratedTasks([])

      setNotice('Your Recovery Mode session has started.')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to start recovery',
      )
    } finally {
      setSaving(false)
    }
  }

  // Generate recovery tasks linked to the active session.
  const handleGeneratePlan = async () => {
    setError('')
    setNotice('')
    setGeneratedTasks([])

    if (!session) {
      setError('Activate Recovery Mode before generating a plan.')
      return
    }

    if (selectedGoalIds.length === 0) {
      setError('Please select at least one active goal.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(
        `${API_URL}/tasks/recovery-plan`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            goalIds: selectedGoalIds,
          }),
        },
      )

      const result: ApiResponse<{
        tasks: Task[]
        totalTasks: number
        recoverySessionId: string
      }> = await response.json()

      if (!response.ok || !result.success || !result.data) {
        throw new Error(
          result.message || 'Unable to generate recovery plan',
        )
      }

      setGeneratedTasks(result.data.tasks)

      await loadData()

      window.dispatchEvent(
        new Event(TASKS_UPDATED_EVENT),
      )

      setNotice(
        `${result.data.totalTasks} recovery tasks generated successfully. Find them in your Tasks module.`,
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to generate recovery plan',
      )
    } finally {
      setSaving(false)
    }
  }

  // Complete the active recovery session.
  const handleCompleteRecovery = async () => {
    if (!session) return

    const confirmed = window.confirm(
      'Are you sure you want to end Recovery Mode? Your recovery session will be marked as completed.',
    )

    if (!confirmed) return

    setError('')
    setNotice('')
    setSaving(true)

    try {
      const response = await fetch(
        `${API_URL}/recovery/${session._id}/complete`,
        {
          method: 'PATCH',
        },
      )

      const result: ApiResponse<RecoverySession> =
        await response.json()

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Unable to complete recovery',
        )
      }

      setSession(null)
      setSelectedGoalIds([])
      setGeneratedTasks([])

      setNotice(
        'Recovery session completed. Welcome back to your routine!',
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to complete recovery',
      )
    } finally {
      setSaving(false)
    }
  }

  // Manually refresh recovery data.
  const handleRefresh = async () => {
    setLoading(true)
    setError('')

    try {
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to refresh recovery data',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">

        {/* Page header */}
        <header className="mb-8">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <HeartHandshake size={25} />
          </div>

          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Reset. Refocus. Restart.
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Recovery Mode
          </h1>

          <p className="mt-2 max-w-2xl text-slate-600">
            Missed your routine? That's okay. Reduce your workload,
            rebuild momentum, and return to consistent execution.
          </p>
        </header>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Success message */}
        {notice && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {notice}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Loading your recovery session...
          </div>
        ) : session ? (
          <div className="space-y-6">

            {/* Recovery Plan Generator */}
            <section className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <WandSparkles size={22} />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Recovery Plan Generator
                  </h2>

                  <p className="text-sm text-slate-500">
                    Select goals for your reduced daily workload.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-indigo-50 p-4">
                <p className="text-sm font-medium text-indigo-800">
                  Your recovery plan will generate {target} manageable
                  tasks for today.
                </p>
              </div>

              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">
                  Select your active goals
                </h3>

                {goals.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                    <Target
                      className="mx-auto text-slate-400"
                      size={28}
                    />

                    <p className="mt-3 font-medium text-slate-700">
                      No active goals found
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Create an active goal in the Goals module first.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {goals.map((goal) => (
                      <label
                        key={goal._id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-indigo-300 hover:bg-indigo-50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGoalIds.includes(goal._id)}
                          onChange={() => toggleGoal(goal._id)}
                          className="h-4 w-4 accent-indigo-600"
                        />

                        <span className="font-medium text-slate-800">
                          {goal.title}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <p className="mt-3 text-xs text-slate-500">
                  Selected goals: {selectedGoalIds.length}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleGeneratePlan()}
                disabled={
                  saving ||
                  selectedGoalIds.length === 0 ||
                  goals.length === 0
                }
                className="mt-6 flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <WandSparkles size={18} />

                {saving
                  ? 'Generating plan...'
                  : 'Generate Recovery Plan'}
              </button>

              {/* Generated task preview */}
              {generatedTasks.length > 0 && (
                <div className="mt-7 rounded-xl border border-green-200 bg-green-50 p-5">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle2 size={20} />

                    <h3 className="font-semibold">
                      Recovery plan generated
                    </h3>
                  </div>

                  <p className="mt-2 text-sm text-green-700">
                    Your new tasks have been saved to your Tasks module.
                  </p>

                  <div className="mt-4 space-y-2">
                    {generatedTasks.map((task) => (
                      <div
                        key={task._id}
                        className="rounded-lg bg-white p-3 text-sm font-medium text-slate-800"
                      >
                        {task.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Active Recovery Session */}
            <section className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    className="text-indigo-600"
                    size={22}
                  />

                  <h2 className="text-xl font-semibold text-slate-900">
                    Your active recovery session
                  </h2>
                </div>

                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  Active
                </span>
              </div>

              {/* Recovery progress */}
              <div className="mt-7 rounded-xl bg-indigo-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-800">
                      <Target size={19} />

                      <p className="text-sm font-semibold">
                        Today's Recovery Progress
                      </p>
                    </div>

                    <p className="mt-3 text-3xl font-bold text-indigo-950">
                      {completedToday}/{target}

                      <span className="ml-2 text-sm font-medium">
                        tasks completed
                      </span>
                    </p>
                  </div>

                  <p className="text-2xl font-bold text-indigo-700">
                    {progressPercentage}%
                  </p>
                </div>

                <div
                  className="mt-5 h-3 overflow-hidden rounded-full bg-indigo-100"
                  role="progressbar"
                  aria-label="Today's recovery progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPercentage}
                >
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                    style={{
                      width: `${progressPercentage}%`,
                    }}
                  />
                </div>

                <p className="mt-3 text-sm text-indigo-800">
                  {remainingTasks === 0
                    ? 'Daily recovery target achieved. Great work!'
                    : `${remainingTasks} more ${
                        remainingTasks === 1 ? 'task' : 'tasks'
                      } to reach today's target.`}
                </p>
              </div>

              {/* Session information */}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">
                    Daily target
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {target} tasks/day
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">
                    Session started
                  </p>

                  <p className="mt-2 text-xl font-semibold text-slate-900">
                    {formatDate(session.startDate)}
                  </p>
                </div>
              </div>

              {/* Recovery reason */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-800">
                  Why you activated Recovery Mode
                </h3>

                <p className="mt-2 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  {session.reason}
                </p>
              </div>

              {/* Recovery reminder */}
              <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <Clock
                  className="mt-0.5 shrink-0 text-amber-700"
                  size={19}
                />

                <p className="text-sm leading-6 text-amber-900">
                  Focus on manageable tasks. Your goal is to rebuild
                  momentum, not to do everything at once.
                </p>
              </div>

              {/* Session actions */}
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={saving || loading}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw size={17} />
                  Refresh progress
                </button>

                <button
                  type="button"
                  onClick={() => void handleCompleteRecovery()}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 size={18} />

                  {saving
                    ? 'Updating session...'
                    : 'End Recovery Session'}
                </button>
              </div>
            </section>
          </div>
        ) : (
          /* Start Recovery Session */
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900">
                Start a recovery session
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose a manageable daily target and tell us what made
                you need a reset.
              </p>
            </div>

            <form
              onSubmit={handleStartRecovery}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="recovery-reason"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Why do you need Recovery Mode?
                </label>

                <textarea
                  id="recovery-reason"
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  minLength={3}
                  maxLength={300}
                  required
                  rows={4}
                  placeholder="e.g. I missed my daily tasks and want to rebuild my routine..."
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <p className="mt-1 text-xs text-slate-400">
                  Maximum 300 characters.
                </p>
              </div>

              <div>
                <label
                  htmlFor="daily-target"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Your reduced daily task target
                </label>

                <input
                  id="daily-target"
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  required
                  value={dailyTarget}
                  onChange={(event) =>
                    setDailyTarget(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />

                <p className="mt-1 text-xs text-slate-400">
                  Choose between 1 and 20 tasks per day.
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? 'Starting recovery...'
                  : 'Activate Recovery Mode'}
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  )
}

export default Recovery




