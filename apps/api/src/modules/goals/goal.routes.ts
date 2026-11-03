import { Router } from 'express'
import Goal from './goal.model.js'

const router = Router()

// Create a goal
router.post('/', async (req, res) => {
  try {
    const { title, description, targetDate } = req.body

    const goal = await Goal.create({
      title,
      description,
      targetDate,
    })

    res.status(201).json({
      success: true,
      data: goal,
    })
  } catch (error) {
    console.error('Error creating goal:', error)

    res.status(500).json({
      success: false,
      message: 'Failed to create goal',
    })
  }
})

// Get all goals
router.get('/', async (_req, res) => {
  try {
    const goals = await Goal.find().sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      data: goals,
    })
  } catch (error) {
    console.error('Error fetching goals:', error)

    res.status(500).json({
      success: false,
      message: 'Failed to fetch goals',
    })
  }
})

export default router