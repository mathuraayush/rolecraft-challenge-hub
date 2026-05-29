import { Router } from "express";
import { uploadSubmissionFile, uploadUserAvatar } from "../controllers/upload.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Protected routes
router.post("/submission", verifyJWT, upload.single("file"), uploadSubmissionFile);
router.post("/avatar", verifyJWT, upload.single("avatar"), uploadUserAvatar);

export default router;
