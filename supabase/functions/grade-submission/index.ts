import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchGithubRepo(url: string): Promise<{ repoContent: string; note: string; filesReviewed: string[]; accessible: boolean }> {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
  if (!match) {
    return { repoContent: "", note: "Submission link is not a valid GitHub URL.", filesReviewed: [], accessible: false };
  }
  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");

  try {
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`);
    const treeData = await treeRes.json().catch(() => ({}));
    if (!treeRes.ok || !treeData.tree) {
      return {
        repoContent: "",
        note: "GitHub repository could not be accessed. It may be private, deleted, or an invalid URL. Penalise heavily for unverifiable submission. Max score: 40.",
        filesReviewed: [],
        accessible: false,
      };
    }

    const codeExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.jsx', '.tsx', '.sql', '.html', '.css', '.go', '.rs', '.php'];
    const codeFiles = (treeData.tree as Array<{ path: string; type: string }>)
      .filter((f) => f.type === "blob" && codeExtensions.some((ext) => f.path.endsWith(ext)))
      .filter((f) => !f.path.includes('node_modules') && !f.path.includes('.min.'))
      .slice(0, 10);

    if (codeFiles.length === 0) {
      return {
        repoContent: "",
        note: "Repository exists but contains no readable code files. Only config or asset files found. Penalise for lack of actual implementation.",
        filesReviewed: [],
        accessible: true,
      };
    }

    const fileContents = await Promise.all(
      codeFiles.map(async (file) => {
        try {
          const raw = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${file.path}`);
          const text = await raw.text();
          return `\n\n=== FILE: ${file.path} ===\n${text.slice(0, 1500)}`;
        } catch {
          return `\n\n=== FILE: ${file.path} ===\n(failed to fetch)`;
        }
      })
    );
    const repoContent = fileContents.join('').slice(0, 12000);
    return { repoContent, note: "", filesReviewed: codeFiles.map((f) => f.path), accessible: true };
  } catch (e) {
    return {
      repoContent: "",
      note: `GitHub fetch error: ${e instanceof Error ? e.message : "unknown"}. Penalise for unverifiable submission.`,
      filesReviewed: [],
      accessible: false,
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project, submission } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Fetch GitHub repo contents if applicable
    let repoSection = "";
    let repoNote = "";
    let filesReviewed: string[] = [];
    let repoAccessible = false;
    const link = submission.submission_link || "";
    const isGithub = /github\.com\//i.test(link);
    if (isGithub) {
      const r = await fetchGithubRepo(link);
      repoNote = r.note;
      filesReviewed = r.filesReviewed;
      repoAccessible = r.accessible;
      if (r.repoContent) {
        repoSection = `\n\nACTUAL REPOSITORY CODE:\n${r.repoContent}`;
      }
      if (r.note) {
        repoSection += `\n\nREPO ACCESS NOTE: ${r.note}`;
      }
    }

    const systemPrompt = `You are a senior hiring manager grading a take-home project submission.
Be honest, constructive, and specific. Reference the candidate's actual content. Give actionable feedback.
Return your evaluation via the grade_submission tool.

${isGithub ? `You have been given the actual code from the student's GitHub repository. You must:
1. Verify the code actually exists and is not a placeholder or someone else's unrelated project. If the repo appears unrelated to the problem (e.g. it is a famous open source project, a template, or contains no code relevant to the challenge), set repo_mismatch: true and reduce score by 30 points minimum.
2. Cross-verify the student's written answers against the actual code. If they claim to have built X but the code shows no evidence of X, flag this as inconsistency and reduce solution_quality score significantly.
3. Check if the code shows genuine problem-solving effort relevant to the challenge domain. Generic boilerplate with no domain-specific logic should score low on solution_quality.
4. Populate the code_review field in your response accordingly.` : ""}

Also analyse the student's written answers for signs of AI generation. Indicators include:
- Overly structured language with perfect transitions
- Generic examples not specific to the given problem
- Buzzword-heavy sentences without concrete reasoning
- Answers that cover all points perfectly without any personal uncertainty or gaps
- No specific numbers, names, or domain details that show original thinking

Populate the authenticity field. If likely_ai_generated is true with medium/high confidence, reduce the overall score by 10 points and set mentor_review_required: true regardless of score.`;

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
${repoSection}

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
                score: { type: "integer", description: "Overall score 0-100" },
                feedback: { type: "string", description: "Markdown feedback. Sections: ## Strengths, ## Areas to improve, ## Verdict. Reference candidate's words and actual code if provided." },
                code_review: {
                  type: "object",
                  properties: {
                    repo_accessible: { type: "boolean" },
                    repo_relevant: { type: "boolean" },
                    repo_mismatch: { type: "boolean" },
                    files_reviewed: { type: "array", items: { type: "string" } },
                    code_quality_observation: { type: "string", description: "2-3 sentences on what the code actually does and its quality" },
                    answers_match_code: { type: "boolean" },
                    inconsistencies_found: { type: "array", items: { type: "string" } },
                  },
                  required: ["repo_accessible", "repo_relevant", "repo_mismatch", "files_reviewed", "code_quality_observation", "answers_match_code", "inconsistencies_found"],
                  additionalProperties: false,
                },
                authenticity: {
                  type: "object",
                  properties: {
                    likely_ai_generated: { type: "boolean" },
                    confidence: { type: "string", enum: ["low", "medium", "high"] },
                    reasoning: { type: "string" },
                    authenticity_score: { type: "integer", description: "0-100, 100=definitely human" },
                  },
                  required: ["likely_ai_generated", "confidence", "reasoning", "authenticity_score"],
                  additionalProperties: false,
                },
                mentor_review_required: { type: "boolean" },
              },
              required: ["score", "feedback", "authenticity", "mentor_review_required"],
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

    // Inject known metadata if model missed it
    if (isGithub && grading.code_review) {
      if (!grading.code_review.files_reviewed?.length && filesReviewed.length) {
        grading.code_review.files_reviewed = filesReviewed;
      }
      if (typeof grading.code_review.repo_accessible !== "boolean") {
        grading.code_review.repo_accessible = repoAccessible;
      }
    }

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
