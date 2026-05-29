import mongoose, { Schema } from "mongoose";

const projectSchema = new Schema(
  {
    role_id: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    problem_statement: {
      type: String,
      required: true,
      trim: true,
    },
    context: {
      type: String,
      default: "",
    },
    deliverables: {
      type: String,
      default: "",
    },
    evaluation_rubric: {
      type: String,
      default: "",
    },
    difficulty_level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    domain: {
      type: String,
      default: "",
    },
    focus_area: {
      type: String,
      default: "",
    },
    estimated_hours: {
      type: String,
      default: "",
    },
    hints: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Project = mongoose.models.Project || mongoose.model("Project", projectSchema);
