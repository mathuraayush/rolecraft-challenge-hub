import { Router } from "express";
import {
  generateProject,
  getUserProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from "../controllers/project.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected routes
router.post("/", verifyJWT, generateProject);
router.get("/my-projects", verifyJWT, getUserProjects);
router.get("/:projectId", verifyJWT, getProjectById);
router.put("/:projectId", verifyJWT, updateProject);
router.delete("/:projectId", verifyJWT, deleteProject);

export default router;
