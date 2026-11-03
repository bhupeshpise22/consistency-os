
import cors from 'cors'
import express from 'express'

import goalRoutes from './modules/goals/goal.routes.js'
import taskRoutes from './modules/tasks/task.routes.js'
import recoveryRoutes from './modules/recovery/recovery.routes.js'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'ConsistencyOS API is running',
  })
})

app.use('/api/goals', goalRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/recovery', recoveryRoutes)

export default app
