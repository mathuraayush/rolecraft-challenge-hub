import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const interestSchema = z.object({
  recruiter_id: z.string().uuid(),
  student_user_id: z.string().uuid(),
});

export const sendRecruiterInterest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => interestSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Verify recruiter belongs to caller
    const { data: recruiter } = await supabaseAdmin
      .from("recruiters")
      .select("id, user_id, name, company, hiring_for_role, email, is_subscribed")
      .eq("id", data.recruiter_id)
      .maybeSingle();
    if (!recruiter) return { status: 404, error: "Recruiter not found" };
    if (recruiter.user_id !== userId) return { status: 403, error: "Forbidden" };
    if (!recruiter.is_subscribed) return { status: 403, error: "Not subscribed" };

    // Already contacted?
    const { data: existing } = await supabaseAdmin
      .from("recruiter_contacts")
      .select("id")
      .eq("recruiter_id", data.recruiter_id)
      .eq("student_user_id", data.student_user_id)
      .maybeSingle();
    if (existing) return { status: 400, error: "Already contacted" };

    // Student
    const { data: student } = await supabaseAdmin
      .from("users")
      .select("id, name, email, role, college, allow_recruiter_contact")
      .eq("id", data.student_user_id)
      .maybeSingle();
    if (!student?.email) return { status: 404, error: "Student not found" };

    const { data: pf } = await supabaseAdmin
      .from("portfolios")
      .select("is_available_for_hire")
      .eq("user_id", data.student_user_id)
      .maybeSingle();

    if (!student.allow_recruiter_contact || !pf?.is_available_for_hire) {
      return { status: 400, error: "Student not available" };
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return { status: 500, error: "Email not configured" };

    const subject = `${recruiter.name} from ${recruiter.company} is interested in your RoleCraft portfolio`;
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
          Not interested right now? Simply ignore this email. You can also turn off recruiter contact in your
          <a href="https://rolecraft.in/settings" style="color:#3730A3;">RoleCraft settings</a>.
        </p>
        <hr style="border:none;border-top:1px solid #E7E5E4;margin:24px 0;" />
        <p style="font-size:12px;color:#A8A29E;line-height:1.5;margin:0;">
          RoleCraft · Connecting emerging talent with product companies ·
          This email was sent because a recruiter expressed interest in your portfolio.
        </p>
      </div>
    `;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RoleCraft <onboarding@resend.dev>",
        to: [student.email],
        reply_to: recruiter.email,
        subject,
        html,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Resend error", resp.status, text);
      return { status: 500, error: "Email send failed" };
    }

    await supabaseAdmin.from("recruiter_contacts").insert({
      recruiter_id: data.recruiter_id,
      student_user_id: data.student_user_id,
      email_sent: true,
    });

    return { status: 200, success: true };
  });

const subSchema = z.object({
  recruiter_id: z.string().uuid(),
  plan_type: z.enum(["monthly", "annual"]),
  phone: z.string().trim().min(1).max(40),
  hiring_count: z.string().min(1).max(20),
});

export const requestSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => subSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: recruiter } = await supabaseAdmin
      .from("recruiters")
      .select("id, user_id, name, company, email")
      .eq("id", data.recruiter_id)
      .maybeSingle();
    if (!recruiter || recruiter.user_id !== userId) {
      return { status: 403, error: "Forbidden" };
    }

    await supabaseAdmin.from("subscription_requests").insert({
      recruiter_id: data.recruiter_id,
      plan_type: data.plan_type,
      phone: data.phone,
      hiring_count: data.hiring_count,
      status: "pending",
    });

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const ADMIN = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (RESEND_API_KEY && ADMIN) {
      const html = `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
          <h2>New ${data.plan_type} request from ${recruiter.name} at ${recruiter.company}</h2>
          <p><strong>Phone:</strong> ${data.phone}</p>
          <p><strong>Hiring count:</strong> ${data.hiring_count}</p>
          <p><strong>Email:</strong> ${recruiter.email}</p>
        </div>
      `;
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "RoleCraft <onboarding@resend.dev>",
            to: [ADMIN],
            subject: `New subscription request — ${recruiter.company}`,
            html,
          }),
        });
      } catch (e) {
        console.error("Admin notify failed", e);
      }
    }

    return { status: 200, success: true };
  });
