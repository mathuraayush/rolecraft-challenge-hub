import mongoose, { Schema } from "mongoose";

const portfolioSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    is_public: {
      type: Boolean,
      default: true,
    },
    headline: {
      type: String,
      default: "",
    },
    is_available_for_hire: {
      type: Boolean,
      default: true,
    },
    bio: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const Portfolio = mongoose.models.Portfolio || mongoose.model("Portfolio", portfolioSchema);
