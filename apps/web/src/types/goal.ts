export type Goal = {
  id: string
  title: string
  description: string
  status: 'active' | 'completed' | 'paused'
  progress: number
  remainingTasks: number
  targetDate: string
}