import mongoose, { Schema } from "mongoose";

const submissionSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    approach_text: {
      type: String,
      default: "",
    },
    problem_understanding: {
      type: String,
      default: "",
    },
    proposed_solution: {
      type: String,
      default: "",
    },
    tradeoffs: {
      type: String,
      default: "",
    },
    success_metrics: {
      type: String,
      default: "",
    },
    reflection_text: {
      type: String,
      default: "",
    },
    submission_link: {
      type: String,
      default: "",
    },
    submission_type: {
      type: String,
      enum: ["github", "gdoc", "notion", "figma", "other"],
      default: "other",
    },
    fetched_content: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "graded"],
      default: "draft",
    },
    ai_score: {
      type: Number,
      default: null,
    },
    ai_feedback: {
      type: String,
      default: "",
    },
    ai_meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
    rejection_reason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const Submission = mongoose.models.Submission || mongoose.model("Submission", submissionSchema);
