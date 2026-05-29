import { uploadOnCloudinary } from "../utils/fileUpload.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const uploadSubmissionFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No file provided");
  }

  const result = await uploadOnCloudinary(req.file.path, "image");

  if (!result) {
    throw new ApiError(500, "Failed to upload file");
  }

  return res.status(200).json(new ApiResponse(200, result, "File uploaded successfully"));
});

const uploadUserAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No file provided");
  }

  const result = await uploadOnCloudinary(req.file.path, "image");

  if (!result) {
    throw new ApiError(500, "Failed to upload avatar");
  }

  return res.status(200).json(new ApiResponse(200, result, "Avatar uploaded successfully"));
});

export { uploadSubmissionFile, uploadUserAvatar };
