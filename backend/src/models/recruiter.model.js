import mongoose, { Schema } from "mongoose";

const recruiterSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    company_size: {
      type: String,
      default: "",
    },
    hiring_for_role: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    saved_searches: {
      type: Schema.Types.Mixed,
      default: [],
    },
    is_subscribed: {
      type: Boolean,
      default: false,
    },
    subscribed_at: {
      type: Date,
      default: null,
    },
    subscription_plan: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const Recruiter = mongoose.models.Recruiter || mongoose.model("Recruiter", recruiterSchema);
