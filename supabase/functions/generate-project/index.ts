import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { roleName, roleSlug, level } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a senior hiring manager who designs realistic take-home challenges for ${roleName} candidates at the ${level} level.
Generate ONE project challenge a candidate could complete in 2-5 hours that mirrors a real on-the-job task.
Use a real company/product context (e.g. Spotify, Notion, Zomato, Airbnb).
Return your output via the create_project tool.`;

    const userPrompt = `Generate a unique, fresh ${roleName} project challenge for a ${level} candidate. Pick an interesting product/domain that hasn't been overused. Make the problem statement specific and concrete (not generic).`;

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
            description: "Return a structured project challenge.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short punchy title (max 80 chars)" },
                problem_statement: { type: "string", description: "2-3 sentences stating the core problem to solve" },
                context: { type: "string", description: "Background: company, product, situation. 3-5 sentences." },
                deliverables: { type: "string", description: "Bulleted list of concrete deliverables (use - for bullets)" },
                evaluation_rubric: { type: "string", description: "How submissions will be evaluated. Bulleted criteria." },
                domain: { type: "string", description: "Industry domain e.g. fintech, edtech, consumer, b2b-saas" },
                focus_area: { type: "string", description: "Specific skill area being tested" },
              },
              required: ["title", "problem_statement", "context", "deliverables", "evaluation_rubric", "domain", "focus_area"],
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
    const project = JSON.parse(toolCall.function.arguments);
    project.difficulty_level = level;
    project.role_slug = roleSlug;

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
