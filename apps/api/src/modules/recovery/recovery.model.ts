
import mongoose, { Schema } from 'mongoose'

const recoverySchema = new Schema(
  {
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    dailyTarget: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
      default: 1,
    },
  },
  { timestamps: true },
)

const Recovery = mongoose.model('Recovery', recoverySchema)

export default Recovery
