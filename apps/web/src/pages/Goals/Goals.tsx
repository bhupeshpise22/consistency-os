import { useEffect, useState } from 'react'
import GoalCard from '../../components/goals/GoalCard'
import GoalForm, { type GoalFormData } from '../../components/goals/GoalForm'
import type { Goal } from '../../types/goal'

type ApiGoal = {
  _id: string
  title: string
  description: string
  status: 'active' | 'completed' | 'paused'
  progress: number
  remainingTasks: number
  targetDate: string
  createdAt: string
  updatedAt: string
}

function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchGoals() {
      try {
        const response = await fetch('http://localhost:5000/api/goals')

        if (!response.ok) {
          throw new Error('Failed to fetch goals')
        }

        const result: { success: boolean; data: ApiGoal[] } =
          await response.json()

        const formattedGoals: Goal[] = result.data.map((goal) => ({
          id: goal._id,
          title: goal.title,
          description: goal.description,
          status: goal.status,
          progress: goal.progress,
          remainingTasks: goal.remainingTasks,
          targetDate: goal.targetDate,
        }))

        setGoals(formattedGoals)
      } catch (error) {
        console.error('Error fetching goals:', error)
        setError('Failed to load goals')
      } finally {
        setIsLoading(false)
      }
    }

    fetchGoals()
  }, [])

  async function handleCreateGoal(data: GoalFormData) {
    try {
      setError('')

      const response = await fetch('http://localhost:5000/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create goal')
      }

      const result: { success: boolean; data: ApiGoal } =
        await response.json()

      const newGoal: Goal = {
        id: result.data._id,
        title: result.data.title,
        description: result.data.description,
        status: result.data.status,
        progress: result.data.progress,
        remainingTasks: result.data.remainingTasks,
        targetDate: result.data.targetDate,
      }

      setGoals((currentGoals) => [newGoal, ...currentGoals])
    } catch (error) {
      console.error('Error creating goal:', error)
      setError('Failed to create goal')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <header className="mb-8">
        <p className="text-sm font-medium text-slate-500">Your direction</p>

        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Goals
        </h1>

        <p className="mt-2 text-slate-600">
          Turn your long-term goals into consistent daily execution.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Create a new goal
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Define something meaningful that you want to achieve.
        </p>

        <div className="mt-6 max-w-2xl">
          <GoalForm onSubmitGoal={handleCreateGoal} />
        </div>
      </section>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="text-slate-500">Loading goals...</p>
      ) : goals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-medium text-slate-700">
            No goals yet
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Create your first goal above.
          </p>
        </div>
      ) : (
        <section className="grid gap-6 lg:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </section>
      )}
    </div>
  )
}

export default Goals