import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project, submission } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a senior hiring manager grading a take-home project submission.
Be honest, constructive, and specific. Reference the candidate's actual content. Give actionable feedback.
Return your evaluation via the grade_submission tool.`;

    const userPrompt = `# PROJECT
Title: ${project.title}
Problem: ${project.problem_statement}
Context: ${project.context}
Deliverables: ${project.deliverables}
Rubric: ${project.evaluation_rubric}

# CANDIDATE SUBMISSION
Problem understanding:
${submission.problem_understanding || "(not provided)"}

Proposed solution:
${submission.proposed_solution || "(not provided)"}

Tradeoffs:
${submission.tradeoffs || "(not provided)"}

Success metrics:
${submission.success_metrics || "(not provided)"}

Reflection:
${submission.reflection_text || "(not provided)"}

Approach overview:
${submission.approach_text || "(not provided)"}

Submission link: ${submission.submission_link || "(none)"}

Grade this submission against the rubric.`;

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
            name: "grade_submission",
            description: "Return a structured grading.",
            parameters: {
              type: "object",
              properties: {
                score: { type: "integer", description: "Score from 0-100" },
                feedback: { type: "string", description: "Markdown-formatted feedback. Sections: ## Strengths, ## Areas to improve, ## Verdict. Be specific, reference candidate's words." },
              },
              required: ["score", "feedback"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "grade_submission" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No grading returned");
    const grading = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(grading), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("grade-submission error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
