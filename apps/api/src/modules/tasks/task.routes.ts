

import { Router } from 'express'
import mongoose from 'mongoose'
import Goal from '../goals/goal.model.js'
import Recovery from '../recovery/recovery.model.js'
import Task from './task.model.js'

const router = Router()

// Create a normal task
router.post('/', async (req, res) => {
  try {
    const { title, description, goalId, priority, dueDate } = req.body

    if (typeof title !== 'string' || title.trim().length < 3) {
      res.status(400).json({
        success: false,
        message: 'Task title must be at least 3 characters',
      })
      return
    }

    if (typeof goalId !== 'string' || !mongoose.isValidObjectId(goalId)) {
      res.status(400).json({
        success: false,
        message: 'A valid goalId is required',
      })
      return
    }

    const goal = await Goal.findById(goalId)

    if (!goal) {
      res.status(404).json({
        success: false,
        message: 'Goal not found',
      })
      return
    }

    const task = await Task.create({
      title: title.trim(),
      description,
      goalId,
      priority,
      dueDate: dueDate || null,
    })

    res.status(201).json({
      success: true,
      data: task,
    })
  } catch (error) {
    console.error('Error creating task:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create task',
    })
  }
})

// Generate recovery tasks linked to the active recovery session
router.post('/recovery-plan', async (req, res) => {
  try {
    const { goalIds } = req.body

    if (
      !Array.isArray(goalIds) ||
      goalIds.length === 0 ||
      goalIds.length > 10
    ) {
      res.status(400).json({
        success: false,
        message: 'Select between 1 and 10 goals',
      })
      return
    }

    if (
      !goalIds.every(
        (id: unknown) =>
          typeof id === 'string' && mongoose.isValidObjectId(id),
      )
    ) {
      res.status(400).json({
        success: false,
        message: 'One or more goal IDs are invalid',
      })
      return
    }

    const uniqueGoalIds = [...new Set(goalIds)]

    const recoverySession = await Recovery.findOne({
      status: 'active',
    }).sort({ createdAt: -1 })

    if (!recoverySession) {
      res.status(400).json({
        success: false,
        message: 'Activate Recovery Mode before generating a plan',
      })
      return
    }

    const goals = await Goal.find({
      _id: { $in: uniqueGoalIds },
      status: 'active',
    })

    if (goals.length !== uniqueGoalIds.length) {
      res.status(400).json({
        success: false,
        message: 'One or more selected goals do not exist or are not active',
      })
      return
    }

    // Prevent generating more tasks than the session's daily target.
    // This also prevents repeated clicks from creating duplicate plans.
    const existingRecoveryTasks = await Task.countDocuments({
      recoverySessionId: recoverySession._id,
    })

    if (existingRecoveryTasks > 0) {
      res.status(409).json({
        success: false,
        message:
          'A recovery plan has already been generated for this session',
      })
      return
    }

    const dailyTarget = recoverySession.dailyTarget
    const today = new Date()

    const recoveryTasks = Array.from(
      { length: dailyTarget },
      (_, index) => {
        const goal = goals[index % goals.length]
        const taskNumber = Math.floor(index / goals.length) + 1

        const title =
          dailyTarget > goals.length
            ? `Recovery: ${goal.title} - Step ${taskNumber}`
            : `Recovery: ${goal.title}`

        return {
          title: title.slice(0, 150),
          description:
            'A manageable recovery task. Spend around 25 minutes making progress on this goal. Focus on completing one small step.',
          goalId: goal._id,
          recoverySessionId: recoverySession._id,
          priority: 'low' as const,
          dueDate: today,
        }
      },
    )

    const createdTasks = await Task.insertMany(recoveryTasks)

    // Recalculate progress for each selected goal.
    for (const goal of goals) {
      const goalTasks = await Task.find({ goalId: goal._id })

      const completedTasks = goalTasks.filter(
        (task) => task.status === 'completed',
      ).length

      const progress =
        goalTasks.length === 0
          ? 0
          : Math.round((completedTasks / goalTasks.length) * 100)

      await Goal.findByIdAndUpdate(goal._id, {
        progress,
        remainingTasks: goalTasks.length - completedTasks,
      })
    }

    res.status(201).json({
      success: true,
      message: 'Recovery plan generated successfully',
      data: {
        tasks: createdTasks,
        totalTasks: createdTasks.length,
        recoverySessionId: recoverySession._id,
      },
    })
  } catch (error) {
    console.error('Error generating recovery plan:', error)

    res.status(500).json({
      success: false,
      message: 'Failed to generate recovery plan',
    })
  }
})

// Mark a task as completed and update its goal progress
router.patch('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid task ID',
      })
      return
    }

    const task = await Task.findById(id)

    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found',
      })
      return
    }

    if (task.status !== 'completed') {
      task.status = 'completed'
      task.completedAt = new Date()
      await task.save()
    }

    const goalTasks = await Task.find({ goalId: task.goalId })

    const completedTasks = goalTasks.filter(
      (item) => item.status === 'completed',
    ).length

    const progress =
      goalTasks.length === 0
        ? 0
        : Math.round((completedTasks / goalTasks.length) * 100)

    const remainingTasks = goalTasks.length - completedTasks

    await Goal.findByIdAndUpdate(task.goalId, {
      progress,
      remainingTasks,
    })

    res.status(200).json({
      success: true,
      message: 'Task completed successfully',
      data: {
        task,
        progress,
        remainingTasks,
      },
    })
  } catch (error) {
    console.error('Error completing task:', error)

    res.status(500).json({
      success: false,
      message: 'Failed to complete task',
    })
  }
})

// Fetch tasks, optionally filtered by goal
router.get('/', async (req, res) => {
  try {
    const goalId = req.query.goalId

    if (
      goalId !== undefined &&
      (typeof goalId !== 'string' || !mongoose.isValidObjectId(goalId))
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid goalId',
      })
      return
    }

    const tasks = await Task.find(
      typeof goalId === 'string' ? { goalId } : {},
    )
      .sort({ createdAt: -1 })
      .populate('goalId', 'title')

    res.status(200).json({
      success: true,
      data: tasks,
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)

    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
    })
  }
})

export default router


