import { Router } from "express";
import {
  createSubmissionDraft,
  updateSubmissionDraft,
  submitProject,
  gradeSubmission,
  getSubmission,
  deleteSubmission,
} from "../controllers/submission.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected routes
router.post("/", verifyJWT, createSubmissionDraft);
router.get("/:submissionId", verifyJWT, getSubmission);
router.put("/:submissionId", verifyJWT, updateSubmissionDraft);
router.post("/:submissionId/submit", verifyJWT, submitProject);
router.post("/:submissionId/grade", verifyJWT, gradeSubmission);
router.delete("/:submissionId", verifyJWT, deleteSubmission);

export default router;
