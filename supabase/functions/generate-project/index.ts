import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLE_FORMATS: Record<string, string> = {
  "Product Manager": "PRD document or Google Doc",
  "Software Engineer": "GitHub repository",
  "Data Analyst": "GitHub repository with SQL/notebooks or Google Doc with analysis",
  "UX Designer": "Figma file or PDF wireframes",
  "Business Analyst": "Word document or Google Doc",
  "QA Engineer": "Word document or Google Doc with test cases",
};

const DOMAINS = ["fintech", "edtech", "healthtech", "consumer", "b2b-saas", "logistics"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { roleName, roleSlug, level } = body;
    const role = roleName as string;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const levelKey = String(level || "").toLowerCase();
    const estimatedHoursByLevel: Record<string, string> = {
      beginner: "2-3 hours",
      intermediate: "3-5 hours",
      advanced: "5-8 hours",
    };
    const targetHours = estimatedHoursByLevel[levelKey] || "3-5 hours";
    const domain = body.domain || DOMAINS[Math.floor(Math.random() * DOMAINS.length)];

    const systemPrompt = `You are an expert industry mentor creating a project challenge. You have two absolute constraints that BOTH must be satisfied simultaneously:

CONSTRAINT 1 — ROLE: ${role}
CONSTRAINT 2 — LEVEL: ${level}

These constraints are equally non-negotiable.
A Product Manager never writes code.
A Software Engineer never writes a BRD.
A QA Engineer never designs UI.
A beginner never gets an ambiguous strategic problem.
An advanced student never gets a fully defined single-screen task.

Both constraints must be satisfied in every single field of your response — title, problem statement, deliverables, rubric, and hints.

---

ROLE + LEVEL COMBINATIONS — use these as your exact reference:

PRODUCT MANAGER + BEGINNER:
Problem type: Single well-defined feature request from a real user pain point
Deliverables: User stories (5-7), acceptance criteria, simple priority justification
Complexity: One user type, one feature, no competing stakeholders
Example title: "Write user stories for a bill-split feature in a payments app"
Hints: 3 detailed hints explaining frameworks to use

PRODUCT MANAGER + INTERMEDIATE:
Problem type: Feature with competing priorities or multiple user types
Deliverables: PRD (problem, solution, user stories, success metrics), prioritization rationale, risk identification
Complexity: 2 stakeholder types, one tradeoff decision
Example title: "Prioritize 4 competing features for a healthtech app's next sprint"
Hints: 2-3 directional hints

PRODUCT MANAGER + ADVANCED:
Problem type: Ambiguous business problem requiring problem definition before solution
Deliverables: Problem statement, strategic roadmap, OKRs, go-to-market consideration, risk analysis
Complexity: Multiple departments, business vs user tension, strategic implications
Example title: "Retention is dropping but revenue is up — define the real problem and propose strategy"
Hints: 1 challenging question only

---

SOFTWARE ENGINEER + BEGINNER:
Problem type: Build one small, fully specified feature
Deliverables: Working code in GitHub repo, README explaining approach, basic test cases
Complexity: Single component, flexible tech stack, clear requirements, no design decisions needed
Example title: "Build a working to-do list app with add, edit, delete and completion toggle"
Hints: 3 hints about implementation approach

SOFTWARE ENGINEER + INTERMEDIATE:
Problem type: Build a system with multiple components requiring design decisions
Deliverables: Working code in GitHub, system design explanation, API documentation, error handling
Complexity: 2-3 components, database design, some architectural choices
Example title: "Build a URL shortener with click tracking and basic analytics dashboard"
Hints: 2 hints about architecture decisions

SOFTWARE ENGINEER + ADVANCED:
Problem type: Design and build for scale, performance, or security with real constraints
Deliverables: Working implementation or detailed technical design, architecture decisions with tradeoff explanations, handling of edge cases and failure scenarios
Complexity: Distributed systems, performance constraints, security considerations
Example title: "Design a notification system for 1 million users — handle queue, failures, and retry logic"
Hints: 1 hint as a challenging constraint

---

DATA ANALYST + BEGINNER:
Problem type: Analyse one dataset, answer one clear business question
Deliverables: SQL queries or Python analysis, written findings (3-5 key insights), simple visualisation description
Complexity: One dataset, one clear question, familiar metrics
Example title: "Analyse monthly sales data and identify the top 3 performing product categories"
Hints: 3 hints about which metrics to look at

DATA ANALYST + INTERMEDIATE:
Problem type: Investigate a metric anomaly or business problem using data
Deliverables: Hypothesis, analysis approach, SQL or Python code, findings with recommendations
Complexity: Multiple possible causes, requires forming and testing hypotheses
Example title: "User signups dropped 30% in Q3 — investigate why using the provided dataset"
Hints: 2 hints about investigation approach

DATA ANALYST + ADVANCED:
Problem type: Ambiguous business situation requiring metric definition, analysis, and strategic recommendation
Deliverables: Metric framework definition, full analysis, segmentation, insight narrative for business audience, action recommendations
Complexity: Multiple datasets, ambiguous question, requires storytelling and business judgment
Example title: "6 months of product data — define retention metrics, identify at-risk users, recommend interventions"
Hints: 1 hint as a framing question

---

UX DESIGNER + BEGINNER:
Problem type: Audit and redesign ONE specific screen
Deliverables: Usability issues list (5-7 issues with severity), redesign proposal with user flow, Figma wireframes or hand-drawn sketches, design rationale
Complexity: One screen, one user type, clear usability problems
Example title: "Audit the checkout screen of a food delivery app and propose a redesign"
Hints: 3 hints about usability heuristics to apply

UX DESIGNER + INTERMEDIATE:
Problem type: Design a complete multi-step flow considering different user states
Deliverables: User flow diagram, wireframes for all states (empty, loading, error, success), design decisions explained, edge cases covered
Complexity: Multi-step process, 2 user types, error and empty states required
Example title: "Design the onboarding flow for a first-time investor on a trading app"
Hints: 2 hints about flow considerations

UX DESIGNER + ADVANCED:
Problem type: Research-driven design for an ambiguous user problem
Deliverables: Research plan, user personas, insight synthesis, proposed solution with wireframes, design rationale with tradeoffs
Complexity: Ambiguous user needs, multiple personas, research methodology required before design
Example title: "Users are not adopting the savings feature — research why and propose a redesign"
Hints: 1 challenging research question

---

BUSINESS ANALYST + BEGINNER:
Problem type: Map one existing process and identify obvious inefficiencies
Deliverables: AS-IS process flow (step by step), list of inefficiencies with impact, 3-5 improvement recommendations
Complexity: One process, one department, one stakeholder type
Example title: "Map the employee onboarding process at a 50-person startup and identify inefficiencies"
Hints: 3 hints about process mapping methodology

BUSINESS ANALYST + INTERMEDIATE:
Problem type: Gather requirements for a new system from multiple stakeholders
Deliverables: BRD (scope, functional requirements, use cases, assumptions, constraints), stakeholder map, open questions list
Complexity: Multiple stakeholders, some conflicting needs, requires prioritization of requirements
Example title: "Write a BRD for a leave management system for a company with HR, managers, and employees"
Hints: 2 hints about requirements gathering

BUSINESS ANALYST + ADVANCED:
Problem type: Complex organisational transformation with competing departments
Deliverables: Current state analysis, gap analysis, phased TO-BE requirements, risk register, change impact assessment
Complexity: Multiple departments with conflicting goals, phased implementation, risk identification
Example title: "A logistics company moving from manual to digital — gap analysis and phased requirements for 3 departments"
Hints: 1 hint about stakeholder conflict resolution

---

QA ENGINEER + BEGINNER:
Problem type: Write test cases for one clearly defined feature
Deliverables: Test cases (minimum 15) covering happy path, negative cases, and 3-4 edge cases, basic test data examples
Complexity: Single feature, well-defined requirements, no integration testing needed
Example title: "Write test cases for a login page covering all possible scenarios"
Hints: 3 hints about test case structure and edge cases to consider

QA ENGINEER + INTERMEDIATE:
Problem type: Create a complete test plan for a feature or integration
Deliverables: Test strategy, test cases by type (functional, negative, boundary, UI), risk assessment, entry and exit criteria
Complexity: Multiple test types, integration touchpoints, basic risk identification
Example title: "Write a complete test plan for a payment gateway integration"
Hints: 2 hints about test coverage and risk areas

QA ENGINEER + ADVANCED:
Problem type: End-to-end QA strategy for a product launch or major release
Deliverables: Full QA strategy document, all testing types covered (functional, performance, security, regression, UAT), risk matrix, go/no-go criteria, test environment requirements
Complexity: Product-wide scope, multiple teams, release pressure, risk-based prioritization
Example title: "A fintech app goes live in 30 days — write the complete QA strategy and go/no-go criteria"
Hints: 1 hint as a risk-framing question

---

DOMAIN INTEGRATION — ${domain}:
The company context and problem must be from the ${domain} industry. The problem type and deliverables stay exactly as defined above for the role+level combination. Domain only affects the company, product, and problem scenario — never the deliverable type.

Correct: PM + Beginner + Fintech = write user stories for a KYC feature in a lending app (still user stories, just fintech context)
Wrong: PM + Beginner + Fintech = write SQL queries to analyse loan data (SQL is never a PM deliverable)

---

SELF-CHECK before returning JSON:
Ask yourself these 4 questions:
1. Would a ${role} actually produce these deliverables at their job? If no — regenerate.
2. Is the complexity appropriate for ${level}? If no — regenerate.
3. Does the domain (${domain}) appear in the company context and problem? If no — add it.
4. Are there any deliverables that belong to a different role? If yes — remove them and replace with correct ones.

Only return the JSON after passing all 4 checks. Set estimated_hours to exactly "${targetHours}". Set recommended_format to: "${ROLE_FORMATS[role] || "role-appropriate document"}".

Return your output via the create_project tool.`;

    const userPrompt = `Generate a unique, fresh project challenge for a ${role} at ${level} level in the ${domain} industry. Pick a specific fictional company with a realistic situation. The problem and deliverables MUST exactly match the ${role} + ${level} combination defined in the system prompt.`;

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
            description: "Return a structured role+level appropriate project challenge.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Action-oriented title stating exactly what the student will do" },
                company_context: { type: "string", description: `Fictional company name, size, product, current situation in ${domain}` },
                problem_statement: { type: "string", description: "Three paragraphs: background, specific problem with numbers, stakes if unsolved" },
                deliverables: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 1,
                  maxItems: 7,
                  description: `Deliverables matching exactly the ${role} + ${level} combination from the system prompt`,
                },
                evaluation_rubric: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      criteria: { type: "string" },
                      points: { type: "integer" },
                      description: { type: "string" },
                    },
                    required: ["criteria", "points", "description"],
                    additionalProperties: false,
                  },
                  minItems: 4,
                  maxItems: 4,
                  description: "Four rubric criteria, 25 points each: Problem Understanding, Solution Quality, Communication and Clarity, Feasibility and Practicality",
                },
                hints: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 1,
                  maxItems: 3,
                  description: `Number and style of hints calibrated to ${level} (beginner: 3 detailed, intermediate: 2-3 directional, advanced: 1 challenging question)`,
                },
                estimated_hours: { type: "string", description: `Must be exactly "${targetHours}"` },
                recommended_format: { type: "string" },
                domain: { type: "string" },
                focus_area: { type: "string", description: `Specific skill area being tested for ${role}` },
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

    const deliverableText = Array.isArray(raw.deliverables)
      ? raw.deliverables.join(' ').toLowerCase()
      : '';

    const roleDeliverableCheck: Record<string, string[]> = {
      'UX Designer': ['wireframe','user flow','figma','usability','prototype','screen design','ux'],
      'QA Engineer': ['test case','test plan','bug report','regression','acceptance criteria','qa strategy','edge case'],
      'Data Analyst': ['sql','query','dataset','metric','insight','analysis','python','notebook'],
      'Product Manager': ['prd','user stor','roadmap','okr','prioriti','go-to-market','feature spec'],
      'Business Analyst': ['brd','process map','gap analysis','as-is','to-be','stakeholder','requirements','use case'],
      'Software Engineer': ['github','code','implement','build','api','architecture','deploy','function'],
    };

    const wrongRoleKeywords: Record<string, string[]> = {
      'Data Analyst': ['wireframe','user flow','figma','test case','test plan','brd','process map'],
      'QA Engineer': ['wireframe','user flow','figma','sql','query','prd','roadmap','implement','build'],
      'UX Designer': ['sql','query','test case','test plan','brd','implement','build','github repo'],
      'Product Manager': ['wireframe','figma','sql','query','test case','implement code','build a'],
      'Business Analyst': ['wireframe','figma','sql','query','test case','implement','github repo'],
      'Software Engineer': ['wireframe','figma','test case','test plan','brd','process map','user stor'],
    };

    void roleDeliverableCheck;
    const wrongKeywords = wrongRoleKeywords[role] || [];
    const hasWrongDeliverables = wrongKeywords.some((k) => deliverableText.includes(k));

    if (hasWrongDeliverables) {
      console.error(`Role mismatch detected for ${role}:`, deliverableText.slice(0, 200));
      return new Response(JSON.stringify({
        error: "ROLE_MISMATCH",
        message: `Generated project contained wrong deliverables for ${role}. Please try again.`,
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const finalHours = targetHours;
    const contextText = `${raw.company_context || ""}${hintsText}\n\n_Estimated time: ${finalHours}. Recommended format: ${raw.recommended_format || ""}._`;

    const project = {
      title: raw.title,
      problem_statement: raw.problem_statement,
      context: contextText,
      deliverables: deliverablesText,
      evaluation_rubric: rubricText,
      domain: raw.domain || domain,
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
