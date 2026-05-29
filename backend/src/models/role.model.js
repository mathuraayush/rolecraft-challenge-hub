import mongoose, { Schema } from "mongoose";

const roleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    icon_emoji: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Role = mongoose.models.Role || mongoose.model("Role", roleSchema);
