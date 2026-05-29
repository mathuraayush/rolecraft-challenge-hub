import { Router } from "express";
import { getAllRoles, getRoleBySlug, createRole } from "../controllers/role.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.get("/", getAllRoles);
router.get("/:slug", getRoleBySlug);

// Admin routes (optional - could add admin middleware later)
router.post("/", verifyJWT, createRole);

export default router;
