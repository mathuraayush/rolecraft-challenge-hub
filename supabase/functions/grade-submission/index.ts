import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLE_GRADING_FOCUS: Record<string, string> = {
  "Product Manager":
    "Grade on: clarity of user problem definition, quality of prioritization reasoning, completeness of PRD structure (problem, users, goals, requirements, success metrics), stakeholder consideration, and crispness of the written artefact. Do NOT penalise the candidate for not writing code.",
  "Software Engineer":
    "Grade on: code quality, problem-solving approach, system design thinking, implementation completeness, API/architecture clarity. Cross-verify the GitHub repo against their answers.",
  "Data Analyst":
    "Grade on: insight quality, SQL/analysis correctness, storytelling with data, metric relevance, and clarity of the analytical narrative. Do NOT expect UI designs or feature code.",
  "UX Designer":
    "Grade on: user empathy shown, design rationale clarity, research methodology, appropriateness of the proposed flow/wireframes. Do NOT penalise for not writing SQL or code.",
  "Business Analyst":
    "Grade on: process mapping accuracy, requirements completeness, stakeholder awareness, gap identification, and BRD structure. Do NOT expect code, UI mocks, or test cases.",
  "QA Engineer":
    "Grade on: test coverage breadth, edge case thinking, bug report clarity, risk identification, and traceability to acceptance criteria. Do NOT expect feature code implementations.",
};

const CODE_ROLES = new Set(["Software Engineer", "Data Analyst"]);

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
        note: "GitHub repository could not be accessed. It may be private, deleted, or an invalid URL.",
        filesReviewed: [],
        accessible: false,
      };
    }

    const codeExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.jsx', '.tsx', '.sql', '.html', '.css', '.go', '.rs', '.php', '.ipynb', '.md'];
    const codeFiles = (treeData.tree as Array<{ path: string; type: string }>)
      .filter((f) => f.type === "blob" && codeExtensions.some((ext) => f.path.endsWith(ext)))
      .filter((f) => !f.path.includes('node_modules') && !f.path.includes('.min.'))
      .slice(0, 10);

    if (codeFiles.length === 0) {
      return {
        repoContent: "",
        note: "Repository exists but contains no readable code/document files.",
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
      note: `GitHub fetch error: ${e instanceof Error ? e.message : "unknown"}.`,
      filesReviewed: [],
      accessible: false,
    };
  }
}

async function fetchGoogleDoc(url: string): Promise<{ content: string; note: string; accessible: boolean }> {
  try {
    const docIdMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (!docIdMatch) {
      return { content: "", note: "Link does not appear to be a valid Google Doc URL.", accessible: false };
    }
    const docId = docIdMatch[1];
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
    const res = await fetch(exportUrl);
    if (!res.ok) {
      return { content: "", note: "Google Doc could not be fetched. Document may be private or restricted. Set sharing to 'Anyone with the link can view'.", accessible: false };
    }
    const text = await res.text();
    if (!text || text.trim().length < 50) {
      return { content: "", note: "Google Doc appears to be empty or contains very little content.", accessible: true };
    }
    return { content: text.slice(0, 10000), note: "", accessible: true };
  } catch (e) {
    return { content: "", note: `Google Doc fetch error: ${e instanceof Error ? e.message : "unknown"}`, accessible: false };
  }
}

async function fetchNotionPage(url: string): Promise<{ content: string; note: string; accessible: boolean }> {
  try {
    const FIRECRAWL_KEY = "fc-10da60780de844ce88c97e395542df15";
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${FIRECRAWL_KEY}` },
      body: JSON.stringify({ url, formats: ["markdown"] }),
    });
    if (!res.ok) {
      return { content: "", note: "Notion page could not be fetched via Firecrawl. Page may be private.", accessible: false };
    }
    const data = await res.json();
    const content = data?.data?.markdown || data?.markdown || "";
    if (!content || content.trim().length < 50) {
      return { content: "", note: "Notion page appears empty or could not be read. Ensure page is set to public.", accessible: true };
    }
    return { content: content.slice(0, 10000), note: "", accessible: true };
  } catch (e) {
    return { content: "", note: `Notion fetch error: ${e instanceof Error ? e.message : "unknown"}`, accessible: false };
  }
}

async function fetchGenericUrl(url: string): Promise<{ content: string; note: string; accessible: boolean }> {
  try {
    const FIRECRAWL_KEY = "fc-10da60780de844ce88c97e395542df15";
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${FIRECRAWL_KEY}` },
      body: JSON.stringify({ url, formats: ["markdown"] }),
    });
    if (!res.ok) {
      return { content: "", note: "URL could not be fetched. Ensure the link is publicly accessible.", accessible: false };
    }
    const data = await res.json();
    const content = data?.data?.markdown || data?.markdown || "";
    return { content: content.slice(0, 8000), note: "", accessible: !!content };
  } catch (e) {
    return { content: "", note: `URL fetch error: ${e instanceof Error ? e.message : "unknown"}`, accessible: false };
  }
}

async function fetchPDFAsBase64(
  url: string
): Promise<{ base64: string; note: string; accessible: boolean }> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { base64: "", note: "PDF could not be fetched.", accessible: false };
    }
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    const base64 = btoa(binary);
    return { base64, note: "", accessible: true };
  } catch (e) {
    return {
      base64: "",
      note: `PDF fetch error: ${e instanceof Error ? e.message : "unknown"}`,
      accessible: false
    };
  }
}

function countWords(submission: any): number {
  const text = [
    submission.problem_understanding,
    submission.proposed_solution,
    submission.tradeoffs,
    submission.success_metrics,
    submission.reflection_text
  ].filter(Boolean).join(' ');
  return text.trim().split(/\s+/).filter(Boolean).length;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { project, submission, role, level } = await req.json();
    const roleName = (role as string) || "candidate";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const isCodeRole = CODE_ROLES.has(roleName);

    // Only fetch GitHub contents for engineering roles — others submit docs/links.
    let repoSection = "";
    let filesReviewed: string[] = [];
    let repoAccessible = false;
    const link = submission.submission_link || "";
    const isGithub = /github\.com\//i.test(link);
    const isGoogleDoc = /docs\.google\.com\/document/i.test(link);
    const isNotion = /notion\.so\//i.test(link);
    const isFigma = /figma\.com\//i.test(link);
    const hasLink = !!link && link.trim().length > 0;
    const isPDFDesign =
      submission.submission_type === 'pdf_design' ||
      (link.endsWith('.pdf') && roleName === 'UX Designer');
    let pdfBase64 = "";
    let fetchedContent = "";
    let fetchNote = "";
    let fetchAccessible = false;

    if (isGithub && isCodeRole) {
      const r = await fetchGithubRepo(link);
      filesReviewed = r.filesReviewed;
      repoAccessible = r.accessible;
      if (r.repoContent) {
        repoSection = `\n\nACTUAL REPOSITORY CODE:\n${r.repoContent}`;
        fetchedContent = r.repoContent;
        fetchAccessible = true;
      }
      if (r.note) repoSection += `\n\nREPO ACCESS NOTE: ${r.note}`;
      fetchNote = r.note;
    } else if (isGoogleDoc) {
      const r = await fetchGoogleDoc(link);
      fetchedContent = r.content;
      fetchNote = r.note;
      fetchAccessible = r.accessible;
      repoSection = r.content
        ? `\n\nCONTENT FROM THEIR GOOGLE DOC:\n${r.content}`
        : `\n\nGOOGLE DOC NOTE: ${r.note}`;
    } else if (isNotion) {
      const r = await fetchNotionPage(link);
      fetchedContent = r.content;
      fetchNote = r.note;
      fetchAccessible = r.accessible;
      repoSection = r.content
        ? `\n\nCONTENT FROM THEIR NOTION PAGE:\n${r.content}`
        : `\n\nNOTION PAGE NOTE: ${r.note}`;
    } else if (isFigma) {
      repoSection = `\n\nFIGMA LINK SUBMITTED: ${link}\nNote: Figma files cannot be read by AI. Grade written answers only. This submission is automatically flagged for human mentor review who will evaluate the actual design.`;
      fetchNote = "Figma file — requires mentor review";
    } else if (hasLink && !isGithub) {
      const r = await fetchGenericUrl(link);
      fetchedContent = r.content;
      fetchNote = r.note;
      fetchAccessible = r.accessible;
      repoSection = r.content
        ? `\n\nCONTENT FROM SUBMITTED LINK:\n${r.content}`
        : `\n\nLINK ACCESS NOTE: ${r.note}`;
    }

    if (isPDFDesign && hasLink) {
      const r = await fetchPDFAsBase64(link);
      pdfBase64 = r.base64;
      fetchNote = r.note;
      fetchAccessible = r.accessible;
      if (!r.accessible) {
        repoSection = `\n\nPDF ACCESS NOTE: ${r.note}`;
      }
    }

    const wordCount = countWords(submission);

    if (!hasLink) {
      return new Response(JSON.stringify({
        score: 0,
        feedback: `## Submission Rejected — No Proof of Work Submitted

RoleCraft is a portfolio platform. Every submission requires a link to your actual work.

A written description without real work cannot be verified by companies reviewing your portfolio. Anyone can describe work they never did.

**What you need to submit as a ${roleName}:**

${
  roleName === 'Software Engineer' || roleName === 'Data Analyst'
    ? '- A public GitHub repository with your actual code\n- README explaining your approach'
    : roleName === 'UX Designer'
    ? '- A Figma file link (set to anyone with link can view)\n- OR upload a PDF export of your designs\n- Your Figma link must not be empty'
    : roleName === 'Product Manager'
    ? '- A Google Doc or Notion page with your PRD\n- Must be set to anyone with link can view'
    : roleName === 'Business Analyst'
    ? '- A Google Doc or Notion page with your BRD or process maps'
    : '- A Google Doc or Notion page with your test plan and test cases'
}

Your written answers are saved as a draft. Complete your work, add the link, and resubmit.`,
        code_review: {
          repo_accessible: false,
          repo_relevant: false,
          repo_mismatch: false,
          files_reviewed: [],
          code_quality_observation: "No submission link provided — rejected before review.",
          answers_match_code: false,
          inconsistencies_found: ["No proof of work submitted"]
        },
        authenticity: {
          likely_ai_generated: false,
          confidence: "low",
          reasoning: "Rejected before authenticity check.",
          authenticity_score: 50
        },
        mentor_review_required: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (isFigma && wordCount < 150) {
      return new Response(JSON.stringify({
        score: 0,
        feedback: `## Submission Rejected — Written Answers Too Brief

Your Figma link has been received, but since AI cannot read Figma files, your written answers are your primary gradeable submission.

Your answers currently total approximately ${wordCount} words — this is not enough for meaningful evaluation.

**Your written answers must include:**

- A specific list of 5-7 usability issues with severity ratings (High / Medium / Low)
- Detailed rationale for each design decision
- A written description of your user flow step by step — describe what happens on each screen even though it is in Figma
- What design alternatives you considered and why you rejected them

Aim for at least 400 words across all fields. Your Figma link is saved. Expand your answers and resubmit.`,
        code_review: {
          repo_accessible: false,
          repo_relevant: false,
          repo_mismatch: false,
          files_reviewed: [],
          code_quality_observation: "Figma submission rejected — written answers insufficient.",
          answers_match_code: false,
          inconsistencies_found: ["Written answers too brief for Figma submission"]
        },
        authenticity: {
          likely_ai_generated: false,
          confidence: "low",
          reasoning: "Rejected before authenticity check.",
          authenticity_score: 50
        },
        mentor_review_required: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const roleFocus = ROLE_GRADING_FOCUS[roleName] || "Grade them only on what this role is expected to produce.";

    const systemPrompt = `STEP 1 — AUTHENTICITY CHECK (run this before grading):

Analyse all written fields for AI generation signals:
- Perfect structure with no hesitation or gaps
- Buzzwords with no specific examples: leverage, streamline, robust, user-centered, seamless, cutting-edge, holistic
- Covers every point too completely for someone learning
- No personal uncertainty or gaps in knowledge
- No specific details tied to THIS exact problem
- Reflection reads like a conclusion, not genuine thought
- Generic phrases that could apply to ANY project

IF likely_ai_generated is true AND confidence is medium or high:
STOP. Do not grade normally. Return:
- score: 0
- feedback: exactly this message with [placeholders] filled in:
'## Submission Rejected — AI Generated Content Detected

Your submission has been flagged as AI-generated ([confidence level] confidence).

RoleCraft evaluates genuine thinking. AI-generated answers defeat the purpose of building a real portfolio — companies will see through it immediately in interviews.

**Why your submission was flagged:**

[specific phrases or patterns from their actual submission that triggered the flag — be precise]

**What genuine answers look like:**

- Personal uncertainty: I was not sure whether to...
- Specific details: In this problem the constraint of X made me think...
- Your actual reasoning process, not a polished output
- It is okay to be wrong or incomplete — that is human

Your draft is saved. Rewrite in your own words and resubmit.'
- mentor_review_required: false
- authenticity_score: below 30

You are grading a ${roleName} submission at ${level || "unspecified"} level.

CRITICAL ROLE-AWARE RULES:
- Do NOT penalise a Product Manager for not writing code.
- Do NOT penalise a UX Designer for not having SQL queries.
- Do NOT penalise a QA Engineer for not shipping a feature.
- Do NOT penalise a Business Analyst for not producing UI mocks.
- Grade them ONLY on what a ${roleName} is expected to produce.

${roleFocus}

SCORING RULES — follow exactly:

90-100: Exceptional. Hire-ready. Specific insights, strong rationale, all deliverables fully addressed, evidence of deep independent thinking.
75-89: Good. Solid thinking, most deliverables covered, genuine effort clear, minor gaps only.
60-74: Average. Basic understanding shown, surface-level analysis, some deliverables missing or weak.
40-59: Below average. Significant gaps, vague answers, multiple deliverables missing, generic reasoning.
20-39: Poor. Minimal effort, off-topic, deliverables largely ignored.
0: Rejected (AI detected, no link, insufficient content)

MANDATORY PENALTIES — apply these before finalising score:
- Submission link inaccessible (private/broken): -15
- Figma submitted but no written user flow: -10
- Total written words under 200: -20
- Each missing deliverable from the challenge: -8
- Generic language with no problem-specific details: -15
- Answers could apply to ANY project not this one: -20
- No README in GitHub repo: -5
- Repo is fork of famous project with no changes: -25

SCORE CAPS by situation:
- Figma link only, no textual flow description: max 60
- Inaccessible link + weak written answers: max 45
- Strong written answers + verified proof of work: no cap

LEVEL ADJUSTMENT:
- Beginner: add up to 10 grace points for genuine effort
- Advanced: if score below 70, explicitly note this is below the expected bar for their declared level

${isFigma
  ? `This is a UX Designer submission with a Figma link. You CANNOT read the Figma file. Grade ONLY the written answers. Set mentor_review_required: true always. Note in feedback that design will be reviewed by a mentor. Leave code_review fields as not applicable.`
  : fetchedContent
  ? `You have been given the actual content from the student's submitted work (${isGithub ? 'GitHub repository' : isGoogleDoc ? 'Google Doc' : isNotion ? 'Notion page' : 'submitted link'}). You must:
1. Verify the content is actually relevant to the project problem and not a placeholder or someone else's work.
2. Cross-verify their written answers against the actual submitted content. If they claim X but the document shows no evidence of X, flag this.
3. If content appears completely unrelated to the challenge, reduce score by 25 points and explain.
4. For code (SDE/Data roles): populate code_review fully. For document roles (PM/BA/QA/UX): set repo_accessible based on whether the doc was readable, repo_relevant based on content relevance, code_quality_observation to describe doc quality.`
  : hasLink
  ? `A submission link was provided but could not be fetched. Reason: ${fetchNote}. Grade based on written answers only. Note in feedback that the submission link could not be verified and the student should check their sharing settings. Reduce score by 15 points for unverifiable submission.`
  : `No submission link was provided. Grade based on written answers only. Note this in feedback.`
}

${isCodeRole ? `Grade the code on these 4 criteria, 25 points each:

CRITERION 1 — Problem Relevance (0-25):
25: Code directly solves the stated problem. Functions and logic clearly relate to the domain.
15: Partially relevant, missing key solution parts.
5:  Generic boilerplate or tutorial code.
0:  Famous repo, completely unrelated, inaccessible.

CRITERION 2 — Implementation Completeness (0-25):
25: All deliverables have corresponding code. README explains the approach.
15: Most deliverables implemented, some missing.
5:  Skeleton only, not functional.
0:  Empty repo, config files only.

CRITERION 3 — Code Quality (0-25):
25: Meaningful names, focused functions, error handling, consistent style, no obvious bugs.
15: Mostly readable, basic error handling.
5:  Hard to read, no error handling, copy-paste patterns.
0:  Unreadable, no structure.

CRITERION 4 — Answers Match Code (0-25):
25: Written approach matches code exactly.
15: Minor inconsistencies.
5:  Significant mismatch between description and code.
0:  Complete mismatch — described X, built Y.

code_total = sum of 4 criteria
Apply penalties from MANDATORY PENALTIES above.

Overall score weighting for code roles:
Written answers: 40%
Code score: 60%

Add code_criteria_scores to your response:
{
  problem_relevance: 0-25,
  implementation_completeness: 0-25,
  code_quality: 0-25,
  answers_match_code: 0-25,
  penalties_applied: [],
  code_total: 0-100
}` : `For document roles (PM, BA, QA):
Written answers: 60%
Document quality from fetched content: 40%`}

Also analyse the student's written answers for signs of AI generation:
- Overly structured language with perfect transitions
- Generic examples not specific to the given problem
- Buzzword-heavy sentences without concrete reasoning
- No specific numbers, names, or domain details showing original thinking

If likely_ai_generated is true at medium/high confidence, reduce overall score by 10 and set mentor_review_required: true.

Be honest, constructive, and specific. Reference the candidate's actual content. Return your evaluation via the grade_submission tool.`;

    const userPrompt = `# ROLE
${roleName} (${level || "unspecified"} level)

# PROJECT
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

Grade this submission against the rubric using ${roleName}-appropriate criteria.`;

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
            description: "Return a structured role-aware grading.",
            parameters: {
              type: "object",
              properties: {
                score: { type: "integer", description: "Overall score 0-100" },
                feedback: { type: "string", description: "Markdown feedback. Sections: ## Strengths, ## Areas to improve, ## Verdict. Must be framed in role-specific terms." },
                code_review: {
                  type: "object",
                  properties: {
                    repo_accessible: { type: "boolean" },
                    repo_relevant: { type: "boolean" },
                    repo_mismatch: { type: "boolean" },
                    files_reviewed: { type: "array", items: { type: "string" } },
                    code_quality_observation: { type: "string" },
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
                code_criteria_scores: {
                  type: "object",
                  properties: {
                    problem_relevance: { type: "integer" },
                    implementation_completeness: { type: "integer" },
                    code_quality: { type: "integer" },
                    answers_match_code: { type: "integer" },
                    penalties_applied: { type: "array", items: { type: "string" } },
                    code_total: { type: "integer" },
                  },
                  required: ["problem_relevance", "implementation_completeness", "code_quality", "answers_match_code", "penalties_applied", "code_total"],
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

    if (isCodeRole && grading.code_review) {
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
