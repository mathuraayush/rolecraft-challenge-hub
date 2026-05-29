import { User } from "../models/user.model.js";
import { Portfolio } from "../models/portfolio.model.js";
import { Recruiter } from "../models/recruiter.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

const generateTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Token generation failed");
  }
};

const register = asyncHandler(async (req, res) => {
  const { username, email, password, fullName, college, city, bio } = req.body;

  if ([username, email, password, fullName].some((field) => !field || field.trim() === "")) {
    throw new ApiError(400, "All required fields must be filled");
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    fullName,
    college: college || "",
    city: city || "",
    bio: bio || "",
  });

  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  // Create portfolio entry
  await Portfolio.create({
    user_id: user._id,
    is_public: true,
  });

  const { accessToken, refreshToken } = await generateTokens(user._id);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        201,
        {
          user: createdUser,
          accessToken,
          refreshToken,
        },
        "User registered successfully"
      )
    );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateTokens(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const { accessToken, refreshToken } = await generateTokens(user._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const { fullName, college, city, bio, github_url, linkedin_url, level } = req.body;

  if (!fullName && !college && !city && !bio && !github_url && !linkedin_url && !level) {
    throw new ApiError(400, "At least one field must be provided");
  }

  const updateData = {};
  if (fullName) updateData.fullName = fullName;
  if (college) updateData.college = college;
  if (city) updateData.city = city;
  if (bio) updateData.bio = bio;
  if (github_url) updateData.github_url = github_url;
  if (linkedin_url) updateData.linkedin_url = linkedin_url;
  if (level) updateData.level = level;

  const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true }).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Profile updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      avatar: req.file.path,
    },
    { new: true }
  ).select("-password -refreshToken");

  return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const getUserPublicProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId).select("-password -refreshToken -allow_recruiter_contact");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User profile fetched successfully"));
});

const checkRecruiterStatus = asyncHandler(async (req, res) => {
  const recruiter = await Recruiter.findOne({ user_id: req.user._id });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isRecruiter: !!recruiter,
        recruiter: recruiter || null,
      },
      "Recruiter status checked"
    )
  );
});

export {
  register,
  login,
  logout,
  refreshAccessToken,
  getCurrentUser,
  updateUserProfile,
  updateUserAvatar,
  getUserPublicProfile,
  checkRecruiterStatus,
};
