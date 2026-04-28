import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLE_DELIVERABLES: Record<string, string> = {
  "Product Manager":
    "PRDs, user stories, feature prioritization frameworks, roadmaps, OKRs, go-to-market plans — NO CODE",
  "Software Engineer":
    "working code in a GitHub repo, system design documents, API specifications, technical architecture — CODE IS REQUIRED",
  "Data Analyst":
    "SQL queries, data analysis reports, dashboard designs, metric frameworks, insight documents — NO UI DESIGN OR CODE FEATURES",
  "UX Designer":
    "user flows, wireframes in Figma, usability audit reports, research plans, design rationale — NO CODE OR SQL",
  "Business Analyst":
    "BRDs, process flow documents, gap analysis reports, use case specifications, stakeholder maps — NO CODE OR UI DESIGN",
  "QA Engineer":
    "test plans, test cases, bug reports, edge case analysis, acceptance criteria — NO FEATURE IMPLEMENTATION",
};

const ROLE_FORMATS: Record<string, string> = {
  "Product Manager": "PRD document or Google Doc",
  "Software Engineer": "GitHub repository",
  "Data Analyst": "GitHub repository with SQL/notebooks or Google Doc with analysis",
  "UX Designer": "Figma file or PDF wireframes",
  "Business Analyst": "Word document or Google Doc",
  "QA Engineer": "Word document or Google Doc with test cases",
};

function getRoleDeliverables(role: string): string {
  return ROLE_DELIVERABLES[role] || "role-appropriate documents";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { roleName, roleSlug, level } = await req.json();
    const role = roleName as string;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are an expert industry mentor creating a project challenge for a ${role} at ${level} level.

CRITICAL RULES YOU MUST FOLLOW:
1. The deliverables must ONLY be things a ${role} actually produces in their day-to-day job.
2. NEVER ask a Product Manager to write code.
3. NEVER ask a UX Designer to write SQL or Python.
4. NEVER ask a QA Engineer to build features.
5. NEVER ask a Software Engineer to write a BRD.
6. NEVER ask a Data Analyst to design UI flows.
7. NEVER ask a Business Analyst to write test cases.
8. The problem must be from a real industry domain (fintech, edtech, healthtech, consumer, b2b-saas, logistics, etc.).
9. The context must feel like a real company situation a ${role} would actually face at work.
10. Difficulty must match ${level}:
    Beginner: well-defined problem, clear scope, familiar domain.
    Intermediate: some ambiguity, requires prioritization, moderate complexity.
    Advanced: highly ambiguous, multiple stakeholders, strategic implications.

For ${role}, the student should produce: ${getRoleDeliverables(role)}

Recommended submission format for this role: ${ROLE_FORMATS[role] || "role-appropriate document"}.

Return your output via the create_project tool. Every field must be strictly role-appropriate for a ${role}. If you find yourself writing code deliverables for a non-engineering role, STOP and rewrite.`;

    const userPrompt = `Generate a unique, fresh project challenge for a ${role} at ${level} level. Pick a specific fictional company with a realistic situation. The problem must be one a ${role} would actually own at work. Deliverables must ONLY include artefacts a ${role} produces.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_project",
            description: "Return a structured role-specific project challenge.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Specific actionable project title that clearly states what the student will do" },
                company_context: { type: "string", description: "2-3 sentences about a specific fictional company — include company name, size, product, and current situation" },
                problem_statement: { type: "string", description: "3 paragraphs — p1: background and context, p2: the specific problem with data/numbers, p3: what is at stake if not solved" },
                deliverables: {
                  type: "array",
                  description: `Exactly 5 deliverables, each strictly appropriate for a ${role}. ${getRoleDeliverables(role)}`,
                  items: { type: "string" },
                  minItems: 5,
                  maxItems: 5,
                },
                evaluation_rubric: {
                  type: "array",
                  description: "Four rubric criteria, each worth 25 points, tailored to the role",
                  items: {
                    type: "object",
                    properties: {
                      criteria: { type: "string" },
                      points: { type: "integer" },
                      description: { type: "string", description: `Specific to ${role} role` },
                    },
                    required: ["criteria", "points", "description"],
                    additionalProperties: false,
                  },
                  minItems: 4,
                  maxItems: 4,
                },
                hints: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 3,
                  maxItems: 3,
                  description: `Three role-appropriate hints for a ${role}`,
                },
                estimated_hours: { type: "string", description: "e.g. '3-5 hours'" },
                recommended_format: { type: "string", description: `Submission format suited to ${role}` },
                domain: { type: "string", description: "Industry domain e.g. fintech, edtech, consumer, b2b-saas" },
                focus_area: { type: "string", description: "Specific skill area being tested for this role" },
              },
              required: ["title", "company_context", "problem_statement", "deliverables", "evaluation_rubric", "hints", "estimated_hours", "recommended_format", "domain", "focus_area"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_project" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No project generated");
    const raw = JSON.parse(toolCall.function.arguments);

    // Flatten structured fields into the existing DB text columns so storage stays compatible.
    const deliverablesText = Array.isArray(raw.deliverables)
      ? raw.deliverables.map((d: string) => `- ${d}`).join("\n")
      : String(raw.deliverables || "");

    const rubricText = Array.isArray(raw.evaluation_rubric)
      ? raw.evaluation_rubric
          .map((r: { criteria: string; points: number; description: string }) =>
            `- ${r.criteria} (${r.points} pts): ${r.description}`)
          .join("\n")
      : String(raw.evaluation_rubric || "");

    const hintsText = Array.isArray(raw.hints)
      ? `\n\n**Hints**\n${raw.hints.map((h: string) => `- ${h}`).join("\n")}`
      : "";

    const contextText = `${raw.company_context || ""}${hintsText}\n\n_Estimated time: ${raw.estimated_hours || ""}. Recommended format: ${raw.recommended_format || ""}._`;

    const project = {
      title: raw.title,
      problem_statement: raw.problem_statement,
      context: contextText,
      deliverables: deliverablesText,
      evaluation_rubric: rubricText,
      domain: raw.domain,
      focus_area: raw.focus_area,
      difficulty_level: level,
      role_slug: roleSlug,
    };

    return new Response(JSON.stringify({ project }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-project error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
