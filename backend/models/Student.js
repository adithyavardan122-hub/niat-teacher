import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    niatId: {
      type: String,
      required: [true, 'NIAT ID is required'],
      trim: true,
      uppercase: true,
      match: [/^N[0-9A-Za-z]{6,15}$/, 'NIAT ID must start with N followed by alphanumeric code (e.g. N26H04A0123)'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'],
    },
    department: {
      type: String,
      default: 'B.Tech - Artificial Intelligence & Data Science',
      trim: true,
    },
    batch: {
      type: String,
      default: '2024-2028',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
StudentSchema.index({ phone: 1 }, { unique: true });
StudentSchema.index({ niatId: 1 }, { unique: true });

export const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);
