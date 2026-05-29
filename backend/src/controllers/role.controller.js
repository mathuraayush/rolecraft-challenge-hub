import { Role } from "../models/role.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const getAllRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find().sort({ createdAt: 1 });

  if (!roles || roles.length === 0) {
    throw new ApiError(404, "No roles found");
  }

  return res.status(200).json(new ApiResponse(200, roles, "Roles fetched successfully"));
});

const getRoleBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const role = await Role.findOne({ slug: slug.toLowerCase() });

  if (!role) {
    throw new ApiError(404, "Role not found");
  }

  return res.status(200).json(new ApiResponse(200, role, "Role fetched successfully"));
});

const createRole = asyncHandler(async (req, res) => {
  const { name, slug, description, icon_emoji } = req.body;

  if (!name || !slug || !description || !icon_emoji) {
    throw new ApiError(400, "All fields are required");
  }

  const existingRole = await Role.findOne({
    $or: [{ name }, { slug }],
  });

  if (existingRole) {
    throw new ApiError(409, "Role already exists");
  }

  const role = await Role.create({
    name,
    slug: slug.toLowerCase(),
    description,
    icon_emoji,
  });

  return res.status(201).json(new ApiResponse(201, role, "Role created successfully"));
});

export { getAllRoles, getRoleBySlug, createRole };
