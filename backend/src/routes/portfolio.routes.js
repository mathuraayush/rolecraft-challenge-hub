import { Router } from "express";
import {
  searchPortfolios,
  getPortfolioByUserId,
  getMyPortfolio,
  updatePortfolio,
  getPortfolioLeaderboard,
} from "../controllers/portfolio.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.get("/search", searchPortfolios);
router.get("/leaderboard", getPortfolioLeaderboard);
router.get("/user/:userId", getPortfolioByUserId);

// Protected routes
router.get("/my", verifyJWT, getMyPortfolio);
router.put("/my", verifyJWT, updatePortfolio);

export default router;
