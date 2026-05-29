import { Submission } from "../models/submission.model.js";
import { Project } from "../models/project.model.js";
import { Role } from "../models/role.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { gradeSubmissionWithAI } from "../services/ai.service.js";

const createSubmissionDraft = asyncHandler(async (req, res) => {
  const { project_id } = req.body;

  if (!project_id) {
    throw new ApiError(400, "Project ID is required");
  }

  const project = await Project.findById(project_id);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Check if submission already exists
  let submission = await Submission.findOne({
    user_id: req.user._id,
    project_id,
  });

  if (submission) {
    return res
      .status(200)
      .json(new ApiResponse(200, submission, "Draft already exists"));
  }

  submission = await Submission.create({
    user_id: req.user._id,
    project_id,
    status: "draft",
  });

  return res
    .status(201)
    .json(new ApiResponse(201, submission, "Draft created successfully"));
});

const updateSubmissionDraft = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  const {
    approach_text,
    problem_understanding,
    proposed_solution,
    tradeoffs,
    success_metrics,
    reflection_text,
    submission_link,
    submission_type,
  } = req.body;

  const submission = await Submission.findById(submissionId);

  if (!submission) {
    throw new ApiError(404, "Submission not found");
  }

  if (submission.user_id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to update this submission");
  }

  if (submission.status !== "draft") {
    throw new ApiError(400, "Cannot update submitted or graded submissions");
  }

  const updateData = {};
  if (approach_text !== undefined) updateData.approach_text = approach_text;
  if (problem_understanding !== undefined) updateData.problem_understanding = problem_understanding;
  if (proposed_solution !== undefined) updateData.proposed_solution = proposed_solution;
  if (tradeoffs !== undefined) updateData.tradeoffs = tradeoffs;
  if (success_metrics !== undefined) updateData.success_metrics = success_metrics;
  if (reflection_text !== undefined) updateData.reflection_text = reflection_text;
  if (submission_link !== undefined) updateData.submission_link = submission_link;
  if (submission_type !== undefined) updateData.submission_type = submission_type;

  const updatedSubmission = await Submission.findByIdAndUpdate(submissionId, updateData, {
    new: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updatedSubmission, "Draft updated successfully"));
});

const submitProject = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;

  const submission = await Submission.findById(submissionId).populate("project_id");

  if (!submission) {
    throw new ApiError(404, "Submission not found");
  }

  if (submission.user_id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to submit this submission");
  }

  if (!submission.submission_link) {
    throw new ApiError(400, "Submission link is required");
  }

  submission.status = "submitted";
  await submission.save();

  return res
    .status(200)
    .json(new ApiResponse(200, submission, "Project submitted successfully"));
});

const gradeSubmission = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;

  const submission = await Submission.findById(submissionId)
    .populate("project_id")
    .populate({
      path: "project_id",
      populate: {
        path: "role_id",
      },
    });

  if (!submission) {
    throw new ApiError(404, "Submission not found");
  }

  if (submission.status !== "submitted") {
    throw new ApiError(400, "Only submitted projects can be graded");
  }

  const project = submission.project_id;
  const role = project.role_id;

  const gradingResult = await gradeSubmissionWithAI(
    project,
    submission,
    role.name,
    project.difficulty_level
  );

  submission.status = "graded";
  submission.ai_score = gradingResult.score;
  submission.ai_feedback = gradingResult.feedback;
  submission.ai_meta = {
    filesReviewed: gradingResult.filesReviewed || [],
    accessible: gradingResult.accessible,
  };

  await submission.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        submission,
        "Project graded successfully"
      )
    );
});

const getSubmission = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;

  const submission = await Submission.findById(submissionId)
    .populate("project_id")
    .populate("user_id", "fullName email avatar");

  if (!submission) {
    throw new ApiError(404, "Submission not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, submission, "Submission fetched successfully"));
});

const deleteSubmission = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;

  const submission = await Submission.findById(submissionId);

  if (!submission) {
    throw new ApiError(404, "Submission not found");
  }

  if (submission.user_id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to delete this submission");
  }

  await Submission.findByIdAndDelete(submissionId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Submission deleted successfully"));
});

export {
  createSubmissionDraft,
  updateSubmissionDraft,
  submitProject,
  gradeSubmission,
  getSubmission,
  deleteSubmission,
};
