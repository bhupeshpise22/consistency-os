import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const goalSchema = z.object({
  title: z
    .string()
    .min(3, 'Goal title must be at least 3 characters')
    .max(100, 'Goal title must be less than 100 characters'),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),

  targetDate: z
    .string()
    .min(1, 'Target date is required'),
})

export type GoalFormData = z.infer<typeof goalSchema>

type GoalFormProps = {
  onSubmitGoal: (data: GoalFormData) => void
}

function GoalForm({ onSubmitGoal }: GoalFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
  })

  function handleFormSubmit(data: GoalFormData) {
    onSubmitGoal(data)
    reset()
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-5"
    >
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-slate-700"
        >
          Goal title
        </label>

        <input
          id="title"
          type="text"
          placeholder="Become a Full-Stack Developer"
          {...register('title')}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />

        {errors.title && (
          <p className="mt-1 text-sm text-red-600">
            {errors.title.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-slate-700"
        >
          Description
        </label>

        <textarea
          id="description"
          rows={4}
          placeholder="Describe what you want to achieve..."
          {...register('description')}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />

        {errors.description && (
          <p className="mt-1 text-sm text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="targetDate"
          className="block text-sm font-medium text-slate-700"
        >
          Target date
        </label>

        <input
          id="targetDate"
          type="date"
          {...register('targetDate')}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />

        {errors.targetDate && (
          <p className="mt-1 text-sm text-red-600">
            {errors.targetDate.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Create Goal
      </button>
    </form>
  )
}

export default GoalForm