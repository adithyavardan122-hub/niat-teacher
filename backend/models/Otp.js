import mongoose from 'mongoose';

const OtpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    otp: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 300, // Document automatically expires & deletes after 5 minutes (TTL index)
    },
  },
  {
    timestamps: false,
  }
);

OtpSchema.index({ phone: 1 });

export const Otp = mongoose.models.Otp || mongoose.model('Otp', OtpSchema);
