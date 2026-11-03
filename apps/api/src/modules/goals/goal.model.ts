import mongoose, { Schema } from 'mongoose'

const goalSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: ['active', 'completed', 'paused'],
      default: 'active',
    },

    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    remainingTasks: {
      type: Number,
      default: 0,
      min: 0,
    },

    targetDate: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

const Goal = mongoose.model('Goal', goalSchema)

export default Goal