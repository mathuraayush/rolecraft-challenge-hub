import { Router } from "express";
import {
  register,
  login,
  logout,
  refreshAccessToken,
  getCurrentUser,
  updateUserProfile,
  updateUserAvatar,
  getUserPublicProfile,
  checkRecruiterStatus,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshAccessToken);
router.get("/public/:userId", getUserPublicProfile);

// Protected routes
router.post("/logout", verifyJWT, logout);
router.get("/profile", verifyJWT, getCurrentUser);
router.put("/profile", verifyJWT, updateUserProfile);
router.put("/avatar", verifyJWT, upload.single("avatar"), updateUserAvatar);
router.get("/check-recruiter", verifyJWT, checkRecruiterStatus);

export default router;
