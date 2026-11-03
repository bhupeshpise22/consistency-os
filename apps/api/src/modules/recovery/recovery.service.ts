
import Recovery from './recovery.model.js'

type CreateRecoveryInput = {
  reason: string
  dailyTarget: number
}

export async function createRecoverySession(
  input: CreateRecoveryInput,
) {
  const existingSession = await Recovery.findOne({
    status: 'active',
  })

  if (existingSession) {
    throw new Error('An active recovery session already exists')
  }

  return Recovery.create({
    reason: input.reason,
    dailyTarget: input.dailyTarget,
  })
}

export async function getActiveRecoverySession() {
  return Recovery.findOne({ status: 'active' }).sort({
    createdAt: -1,
  })
}

export async function completeRecoverySession(id: string) {
  const session = await Recovery.findById(id)

  if (!session) {
    return null
  }

  if (session.status === 'completed') {
    return session
  }

  session.status = 'completed'
  session.endDate = new Date()

  await session.save()

  return session
}
