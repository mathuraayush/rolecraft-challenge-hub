import { Project } from "../models/project.model.js";
import { Role } from "../models/role.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { generateProjectWithAI } from "../services/ai.service.js";

const DOMAINS = ["fintech", "edtech", "healthtech", "consumer", "b2b-saas", "logistics"];

const generateProject = asyncHandler(async (req, res) => {
  const { roleSlug, level, domain: userDomain } = req.body;

  if (!roleSlug || !level) {
    throw new ApiError(400, "Role slug and level are required");
  }

  const role = await Role.findOne({ slug: roleSlug.toLowerCase() });
  if (!role) {
    throw new ApiError(404, "Role not found");
  }

  if (!["beginner", "intermediate", "advanced"].includes(level)) {
    throw new ApiError(400, "Invalid level");
  }

  const domain = userDomain || DOMAINS[Math.floor(Math.random() * DOMAINS.length)];

  const projectData = await generateProjectWithAI(role.name, roleSlug, level, domain);

  const project = await Project.create({
    role_id: role._id,
    user_id: req.user._id,
    title: projectData.title,
    problem_statement: projectData.problem_statement,
    context: projectData.context || "",
    deliverables: projectData.deliverables || "",
    evaluation_rubric: projectData.evaluation_rubric || "",
    difficulty_level: level,
    domain,
    focus_area: projectData.focus_area || "",
    estimated_hours: projectData.estimated_hours || "",
    hints: projectData.hints || [],
  });

  const populatedProject = await project.populate("role_id", "name slug description icon_emoji");

  return res
    .status(201)
    .json(new ApiResponse(201, populatedProject, "Project generated successfully"));
});

const getUserProjects = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, level, domain } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

  const filter = { user_id: req.user._id };

  if (level && ["beginner", "intermediate", "advanced"].includes(level)) {
    filter.difficulty_level = level;
  }

  if (domain) {
    filter.domain = domain;
  }

  const projects = await Project.find(filter)
    .populate("role_id", "name slug description icon_emoji")
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .skip((pageNum - 1) * limitNum)
    .lean();

  const total = await Project.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        projects,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
      "Projects fetched successfully"
    )
  );
});

const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId).populate("role_id", "name slug description icon_emoji");

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return res.status(200).json(new ApiResponse(200, project, "Project fetched successfully"));
});

const updateProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { title, problem_statement, context, deliverables, evaluation_rubric } = req.body;

  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  if (project.user_id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to update this project");
  }

  if (title) project.title = title;
  if (problem_statement) project.problem_statement = problem_statement;
  if (context) project.context = context;
  if (deliverables) project.deliverables = deliverables;
  if (evaluation_rubric) project.evaluation_rubric = evaluation_rubric;

  await project.save();

  const updatedProject = await Project.findById(projectId).populate("role_id", "name slug description icon_emoji");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedProject, "Project updated successfully"));
});

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  if (project.user_id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Unauthorized to delete this project");
  }

  await Project.findByIdAndDelete(projectId);

  return res.status(200).json(new ApiResponse(200, {}, "Project deleted successfully"));
});

export { generateProject, getUserProjects, getProjectById, updateProject, deleteProject };
