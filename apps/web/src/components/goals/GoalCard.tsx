import type { Goal } from '../../types/goal'

type GoalCardProps = {
  goal: Goal
}

function GoalCard({ goal }: GoalCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {goal.status}
          </p>

          <h2 className="mt-2 text-xl font-semibold text-slate-900">
            {goal.title}
          </h2>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {goal.progress}%
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-600">
        {goal.description}
      </p>

      <div className="mt-6">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-slate-700">
            Progress
          </span>

          <span className="text-slate-500">
            {goal.progress}%
          </span>
        </div>

        <div className="mt-2 h-2 rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-slate-900"
            style={{ width: `${goal.progress}%` }}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-sm text-slate-500">
          {goal.remainingTasks} tasks remaining
        </span>

        <span className="text-sm text-slate-500">
          Target: {new Date(goal.targetDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
})}
        </span>
      </div>
    </div>
  )
}

export default GoalCard