import { Recruiter } from "../models/recruiter.model.js";
import { RecruiterContact } from "../models/recruiter-contact.model.js";
import { SubscriptionRequest } from "../models/subscription-request.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Resend } from "resend";

const registerRecruiter = asyncHandler(async (req, res) => {
  const { name, company, company_size, hiring_for_role, email } = req.body;

  if (!name || !company || !email) {
    throw new ApiError(400, "Name, company, and email are required");
  }

  const existingRecruiter = await Recruiter.findOne({ user_id: req.user._id });

  if (existingRecruiter) {
    throw new ApiError(409, "User is already registered as recruiter");
  }

  const recruiter = await Recruiter.create({
    user_id: req.user._id,
    name,
    company,
    company_size: company_size || "",
    hiring_for_role: hiring_for_role || "",
    email: email.toLowerCase(),
  });

  // Update user role
  await User.findByIdAndUpdate(req.user._id, { role: "recruiter" });

  return res
    .status(201)
    .json(new ApiResponse(201, recruiter, "Recruiter registered successfully"));
});

const getRecruiterProfile = asyncHandler(async (req, res) => {
  const recruiter = await Recruiter.findOne({ user_id: req.user._id });

  if (!recruiter) {
    throw new ApiError(404, "Recruiter profile not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, recruiter, "Recruiter profile fetched successfully"));
});

const updateRecruiterProfile = asyncHandler(async (req, res) => {
  const { name, company, company_size, hiring_for_role } = req.body;

  const recruiter = await Recruiter.findOne({ user_id: req.user._id });

  if (!recruiter) {
    throw new ApiError(404, "Recruiter profile not found");
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (company) updateData.company = company;
  if (company_size) updateData.company_size = company_size;
  if (hiring_for_role) updateData.hiring_for_role = hiring_for_role;

  const updatedRecruiter = await Recruiter.findByIdAndUpdate(recruiter._id, updateData, {
    new: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updatedRecruiter, "Profile updated successfully"));
});

const addContact = asyncHandler(async (req, res) => {
  const { student_user_id } = req.body;

  if (!student_user_id) {
    throw new ApiError(400, "Student user ID is required");
  }

  const recruiter = await Recruiter.findOne({ user_id: req.user._id });

  if (!recruiter) {
    throw new ApiError(404, "Recruiter profile not found");
  }

  if (!recruiter.is_subscribed) {
    throw new ApiError(403, "Recruiter subscription required");
  }

  const student = await User.findById(student_user_id);

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  let contact = await RecruiterContact.findOne({
    recruiter_id: recruiter._id,
    student_user_id,
  });

  if (contact) {
    return res.status(200).json(new ApiResponse(200, contact, "Contact already exists"));
  }

  let emailSent = false;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (RESEND_API_KEY && student.email) {
    try {
      const resend = new Resend(RESEND_API_KEY);
      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1C1917;">
          <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;">Someone noticed your work 👋</h1>
          <p style="font-size:15px;line-height:1.6;color:#44403C;margin:0 0 16px;">
            <strong>${recruiter.name}</strong> from <strong>${recruiter.company}</strong> viewed your RoleCraft portfolio
            and is interested in connecting with you for a <strong>${recruiter.hiring_for_role || "role"}</strong> opportunity.
          </p>
          <div style="background:#F5F5F4;border-radius:12px;padding:16px;margin:20px 0;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#44403C;">
              To connect with ${recruiter.name}, simply <strong>reply to this email</strong>.
              Your reply goes directly to them. RoleCraft never sees your conversation.
            </p>
          </div>
          <p style="font-size:13px;color:#78716C;line-height:1.6;margin:16px 0;">
            Not interested? Simply ignore this email or turn off recruiter contact in your RoleCraft settings.
          </p>
        </div>
      `;
      await resend.emails.send({
        from: "RoleCraft <onboarding@resend.dev>",
        to: student.email,
        replyTo: recruiter.email,
        subject: `${recruiter.name} from ${recruiter.company} is interested in your RoleCraft portfolio`,
        html,
      });
      emailSent = true;
    } catch (error) {
      console.error("Resend email error:", error.message);
    }
  }

  contact = await RecruiterContact.create({
    recruiter_id: recruiter._id,
    student_user_id,
    email_sent: emailSent,
  });

  return res.status(201).json(new ApiResponse(201, contact, "Contact added successfully"));
});

const getContacts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

  const recruiter = await Recruiter.findOne({ user_id: req.user._id });

  if (!recruiter) {
    throw new ApiError(404, "Recruiter profile not found");
  }

  const contacts = await RecruiterContact.find({ recruiter_id: recruiter._id })
    .populate("student_user_id", "fullName email avatar role level")
    .sort({ contacted_at: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  const total = await RecruiterContact.countDocuments({ recruiter_id: recruiter._id });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        contacts,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
      "Contacts fetched successfully"
    )
  );
});

const removeContact = asyncHandler(async (req, res) => {
  const { contactId } = req.params;

  const contact = await RecruiterContact.findById(contactId);

  if (!contact) {
    throw new ApiError(404, "Contact not found");
  }

  const recruiter = await Recruiter.findOne({ user_id: req.user._id });

  if (!recruiter || contact.recruiter_id.toString() !== recruiter._id.toString()) {
    throw new ApiError(403, "Unauthorized to delete this contact");
  }

  await RecruiterContact.findByIdAndDelete(contactId);

  return res.status(200).json(new ApiResponse(200, {}, "Contact removed successfully"));
});

const saveSearch = asyncHandler(async (req, res) => {
  const { name, filters } = req.body;

  if (!name || !filters) {
    throw new ApiError(400, "Name and filters are required");
  }

  const recruiter = await Recruiter.findOne({ user_id: req.user._id });

  if (!recruiter) {
    throw new ApiError(404, "Recruiter profile not found");
  }

  const savedSearch = {
    id: Date.now().toString(),
    name,
    filters,
    created_at: new Date(),
  };

  const currentSearches = Array.isArray(recruiter.saved_searches) ? recruiter.saved_searches : [];
  currentSearches.push(savedSearch);

  const updatedRecruiter = await Recruiter.findByIdAndUpdate(
    recruiter._id,
    { saved_searches: currentSearches },
    { new: true }
  );

  return res.status(201).json(new ApiResponse(201, updatedRecruiter, "Search saved successfully"));
});

const deleteSearch = asyncHandler(async (req, res) => {
  const { searchId } = req.params;

  const recruiter = await Recruiter.findOne({ user_id: req.user._id });

  if (!recruiter) {
    throw new ApiError(404, "Recruiter profile not found");
  }

  const currentSearches = Array.isArray(recruiter.saved_searches) ? recruiter.saved_searches : [];
  const updatedSearches = currentSearches.filter((search) => search.id !== searchId);

  const updatedRecruiter = await Recruiter.findByIdAndUpdate(
    recruiter._id,
    { saved_searches: updatedSearches },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedRecruiter, "Search deleted successfully"));
});

const requestSubscription = asyncHandler(async (req, res) => {
  const { plan_type, phone, hiring_count } = req.body;

  if (!plan_type) {
    throw new ApiError(400, "Plan type is required");
  }

  const recruiter = await Recruiter.findOne({ user_id: req.user._id });

  if (!recruiter) {
    throw new ApiError(404, "Recruiter profile not found");
  }

  const request = await SubscriptionRequest.create({
    recruiter_id: recruiter._id,
    plan_type,
    phone: phone || "",
    hiring_count: hiring_count || "",
    status: "pending",
  });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;

  if (RESEND_API_KEY && ADMIN_EMAIL) {
    try {
      const resend = new Resend(RESEND_API_KEY);
      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2>New ${plan_type} subscription request from ${recruiter.name} at ${recruiter.company}</h2>
          <p><strong>Phone:</strong> ${phone || "N/A"}</p>
          <p><strong>Hiring count:</strong> ${hiring_count || "N/A"}</p>
          <p><strong>Recruiter email:</strong> ${recruiter.email}</p>
          <p><strong>Plan:</strong> ${plan_type}</p>
          <p>Review and approve in admin dashboard.</p>
        </div>
      `;
      await resend.emails.send({
        from: "RoleCraft <onboarding@resend.dev>",
        to: ADMIN_EMAIL,
        replyTo: recruiter.email,
        subject: `New ${plan_type} subscription request — ${recruiter.company}`,
        html,
      });
    } catch (error) {
      console.error("Admin notification email error:", error.message);
    }
  }

  return res.status(201).json(new ApiResponse(201, request, "Subscription request created"));
});

const approveSubscription = asyncHandler(async (req, res) => {
  const { subscriptionRequestId } = req.params;

  const subscriptionRequest = await SubscriptionRequest.findById(subscriptionRequestId);

  if (!subscriptionRequest) {
    throw new ApiError(404, "Subscription request not found");
  }

  if (subscriptionRequest.status === "approved") {
    return res.status(400).json(new ApiResponse(400, {}, "Already approved"));
  }

  const recruiter = await Recruiter.findByIdAndUpdate(
    subscriptionRequest.recruiter_id,
    {
      is_subscribed: true,
      subscribed_at: new Date(),
      subscription_plan: subscriptionRequest.plan_type,
    },
    { new: true }
  );

  const updatedRequest = await SubscriptionRequest.findByIdAndUpdate(
    subscriptionRequestId,
    { status: "approved" },
    { new: true }
  );

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (RESEND_API_KEY && recruiter.email) {
    try {
      const resend = new Resend(RESEND_API_KEY);
      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2>Your RoleCraft subscription is approved! 🎉</h2>
          <p>Hi ${recruiter.name},</p>
          <p>Your <strong>${subscriptionRequest.plan_type}</strong> subscription request has been approved.</p>
          <p>You can now search and contact student portfolios on RoleCraft.</p>
          <p>Log in to your dashboard to get started.</p>
        </div>
      `;
      await resend.emails.send({
        from: "RoleCraft <onboarding@resend.dev>",
        to: recruiter.email,
        subject: "Your RoleCraft subscription is approved!",
        html,
      });
    } catch (error) {
      console.error("Approval confirmation email error:", error.message);
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { recruiter, subscriptionRequest: updatedRequest }, "Subscription approved"));
});

export {
  registerRecruiter,
  getRecruiterProfile,
  updateRecruiterProfile,
  addContact,
  getContacts,
  removeContact,
  saveSearch,
  deleteSearch,
  requestSubscription,
  approveSubscription,
};
