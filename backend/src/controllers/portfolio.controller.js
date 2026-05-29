import { Portfolio } from "../models/portfolio.model.js";
import { Submission } from "../models/submission.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const searchPortfolios = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, role, level, domain, search } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

  const filter = { is_public: true };

  if (search) {
    filter.$or = [
      { headline: { $regex: search, $options: "i" } },
      { bio: { $regex: search, $options: "i" } },
    ];
  }

  let portfolios = await Portfolio.find(filter)
    .populate("user_id", "fullName email avatar github_url linkedin_url role level")
    .sort({ updatedAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .lean();

  // Apply role and level filters by fetching submissions
  if (role || level || domain) {
    portfolios = await Promise.all(
      portfolios.map(async (portfolio) => {
        const submissions = await Submission.find({
          user_id: portfolio.user_id._id,
          status: "graded",
        }).populate({
          path: "project_id",
          select: "difficulty_level domain role_id",
          populate: { path: "role_id", select: "slug" },
        });

        const hasMatch =
          submissions.length === 0 ||
          submissions.some((sub) => {
            const project = sub.project_id;
            const matchesRole = !role || project.role_id?.slug === role;
            const matchesLevel = !level || project.difficulty_level === level;
            const matchesDomain = !domain || project.domain === domain;
            return matchesRole && matchesLevel && matchesDomain;
          });

        return hasMatch ? portfolio : null;
      })
    );

    portfolios = portfolios.filter((p) => p !== null);
  }

  const total = portfolios.length;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        portfolios,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
      "Portfolios fetched successfully"
    )
  );
});

const getPortfolioByUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const portfolio = await Portfolio.findOne({ user_id: userId }).populate(
    "user_id",
    "fullName email avatar github_url linkedin_url role level college city"
  );

  if (!portfolio) {
    throw new ApiError(404, "Portfolio not found");
  }

  const submissions = await Submission.find({
    user_id: userId,
    status: "graded",
  })
    .populate("project_id")
    .sort({ updatedAt: -1 });

  const stats = {
    total_submissions: submissions.length,
    average_score:
      submissions.length > 0
        ? (
            submissions.reduce((acc, sub) => acc + (sub.ai_score || 0), 0) /
            submissions.length
          ).toFixed(2)
        : 0,
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        portfolio,
        submissions,
        stats,
      },
      "Portfolio fetched successfully"
    )
  );
});

const getMyPortfolio = asyncHandler(async (req, res) => {
  const portfolio = await Portfolio.findOne({ user_id: req.user._id }).populate(
    "user_id",
    "fullName email avatar github_url linkedin_url role level college city"
  );

  if (!portfolio) {
    throw new ApiError(404, "Portfolio not found");
  }

  const submissions = await Submission.find({
    user_id: req.user._id,
  })
    .populate("project_id")
    .sort({ updatedAt: -1 });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        portfolio,
        submissions,
      },
      "My portfolio fetched successfully"
    )
  );
});

const updatePortfolio = asyncHandler(async (req, res) => {
  const { headline, bio, is_available_for_hire, is_public } = req.body;

  const portfolio = await Portfolio.findOne({ user_id: req.user._id });

  if (!portfolio) {
    throw new ApiError(404, "Portfolio not found");
  }

  const updateData = {};
  if (headline !== undefined) updateData.headline = headline;
  if (bio !== undefined) updateData.bio = bio;
  if (is_available_for_hire !== undefined) updateData.is_available_for_hire = is_available_for_hire;
  if (is_public !== undefined) updateData.is_public = is_public;

  const updatedPortfolio = await Portfolio.findByIdAndUpdate(portfolio._id, updateData, {
    new: true,
  }).populate("user_id", "fullName email avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedPortfolio, "Portfolio updated successfully"));
});

const getPortfolioLeaderboard = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

  const leaderboard = await Submission.aggregate([
    { $match: { status: "graded" } },
    {
      $group: {
        _id: "$user_id",
        average_score: { $avg: "$ai_score" },
        total_projects: { $sum: 1 },
      },
    },
    { $sort: { average_score: -1 } },
    { $skip: (pageNum - 1) * limitNum },
    { $limit: limitNum },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $project: {
        _id: 1,
        average_score: { $round: ["$average_score", 2] },
        total_projects: 1,
        user: { $arrayElemAt: ["$user", 0] },
      },
    },
  ]);

  const total = await Submission.aggregate([
    { $match: { status: "graded" } },
    { $group: { _id: "$user_id" } },
    { $count: "count" },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        leaderboard,
        pagination: {
          total: total[0]?.count || 0,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil((total[0]?.count || 0) / limitNum),
        },
      },
      "Leaderboard fetched successfully"
    )
  );
});

export {
  searchPortfolios,
  getPortfolioByUserId,
  getMyPortfolio,
  updatePortfolio,
  getPortfolioLeaderboard,
};
