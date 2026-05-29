import mongoose, { Schema } from "mongoose";

const recruiterContactSchema = new Schema(
  {
    recruiter_id: {
      type: Schema.Types.ObjectId,
      ref: "Recruiter",
      required: true,
    },
    student_user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contacted_at: {
      type: Date,
      default: Date.now,
    },
    email_sent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

recruiterContactSchema.index({ recruiter_id: 1, student_user_id: 1 }, { unique: true });

export const RecruiterContact = mongoose.models.RecruiterContact || mongoose.model("RecruiterContact", recruiterContactSchema);
