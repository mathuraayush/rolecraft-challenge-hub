import mongoose, { Schema } from "mongoose";

const subscriptionRequestSchema = new Schema(
  {
    recruiter_id: {
      type: Schema.Types.ObjectId,
      ref: "Recruiter",
      required: true,
    },
    plan_type: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
    },
    hiring_count: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    requested_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const SubscriptionRequest = mongoose.models.SubscriptionRequest || mongoose.model("SubscriptionRequest", subscriptionRequestSchema);
