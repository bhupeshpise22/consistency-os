
import { Router } from 'express'
import mongoose from 'mongoose'

import {
  completeRecoverySession,
  createRecoverySession,
  getActiveRecoverySession,
} from './recovery.service.js'

const router = Router()

// Create a recovery session
router.post('/', async (req, res) => {
  try {
    const { reason, dailyTarget } = req.body

    if (
      typeof reason !== 'string' ||
      reason.trim().length < 3 ||
      reason.trim().length > 300
    ) {
      res.status(400).json({
        success: false,
        message: 'Reason must contain between 3 and 300 characters',
      })
      return
    }

    const target = dailyTarget === undefined ? 1 : dailyTarget

    if (
      typeof target !== 'number' ||
      !Number.isInteger(target) ||
      target < 1 ||
      target > 20
    ) {
      res.status(400).json({
        success: false,
        message: 'Daily target must be an integer between 1 and 20',
      })
      return
    }

    const session = await createRecoverySession({
      reason: reason.trim(),
      dailyTarget: target,
    })

    res.status(201).json({
      success: true,
      message: 'Recovery session created successfully',
      data: session,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create recovery session'

    if (message === 'An active recovery session already exists') {
      res.status(409).json({
        success: false,
        message,
      })
      return
    }

    console.error('Error creating recovery session:', error)

    res.status(500).json({
      success: false,
      message: 'Failed to create recovery session',
    })
  }
})

// Get active recovery session
router.get('/', async (_req, res) => {
  try {
    const session = await getActiveRecoverySession()

    res.status(200).json({
      success: true,
      data: session,
    })
  } catch (error) {
    console.error('Error fetching recovery session:', error)

    res.status(500).json({
      success: false,
      message: 'Failed to fetch recovery session',
    })
  }
})

// Complete recovery session
router.patch('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid recovery session ID',
      })
      return
    }

    const session = await completeRecoverySession(id)

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Recovery session not found',
      })
      return
    }

    res.status(200).json({
      success: true,
      message: 'Recovery session completed',
      data: session,
    })
  } catch (error) {
    console.error('Error completing recovery session:', error)

    res.status(500).json({
      success: false,
      message: 'Failed to complete recovery session',
    })
  }
})

export default router
