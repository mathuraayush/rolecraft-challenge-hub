import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";

interface Project {
  id: string;
  user_id: string;
  role_id: string | null;
  title: string;
  problem_statement: string;
  context: string | null;
  deliverables: string | null;
  evaluation_rubric: string | null;
  domain: string | null;
  focus_area: string | null;
  difficulty_level: string | null;
}

interface Submission {
  id: string;
  approach_text: string | null;
  problem_understanding: string | null;
  proposed_solution: string | null;
  tradeoffs: string | null;
  success_metrics: string | null;
  reflection_text: string | null;
  submission_link: string | null;
  submission_type: string | null;
  status: string;
  ai_score: number | null;
  ai_feedback: string | null;
  ai_meta: AiMeta | null;
}

interface AiMeta {
  code_review?: {
    repo_accessible: boolean;
    repo_relevant: boolean;
    repo_mismatch: boolean;
    files_reviewed: string[];
    code_quality_observation: string;
    answers_match_code: boolean;
    inconsistencies_found: string[];
  };
  authenticity?: {
    likely_ai_generated: boolean;
    confidence: "low" | "medium" | "high";
    reasoning: string;
    authenticity_score: number;
  };
  mentor_review_required?: boolean;
  code_criteria_scores?: {
    problem_relevance: number;
    implementation_completeness: number;
    code_quality: number;
    answers_match_code: number;
    penalties_applied?: string[];
    code_total: number;
  };
}

export const Route = createFileRoute("/projects/$id")({
  component: ProjectPage,
});

function ProjectPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [roleName, setRoleName] = useState<string>("");
  const [sub, setSub] = useState<Submission | null>(null);
  const [saving, setSaving] = useState(false);
  const [grading, setGrading] = useState(false);

  // form state
  const [problemUnderstanding, setPU] = useState("");
  const [proposedSolution, setPS] = useState("");
  const [tradeoffs, setTO] = useState("");
  const [successMetrics, setSM] = useState("");
  const [reflection, setRefl] = useState("");
  const [link, setLink] = useState("");
  const [linkType, setLinkType] = useState("github");
  const [approach, setApproach] = useState("");
  const [uxTab, setUxTab] = useState<"figma" | "pdf">("figma");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (!p) { toast.error("Project not found"); navigate({ to: "/dashboard" }); return; }
      setProject(p as Project);
      if (p.role_id) {
        const { data: r } = await supabase.from("roles").select("name").eq("id", p.role_id).maybeSingle();
        if (r?.name) setRoleName(r.name);
      }
      const { data: s } = await supabase.from("submissions").select("*").eq("project_id", id).eq("user_id", user.id).maybeSingle();
      if (s) {
        setSub(s as Submission);
        setPU(s.problem_understanding || "");
        setPS(s.proposed_solution || "");
        setTO(s.tradeoffs || "");
        setSM(s.success_metrics || "");
        setRefl(s.reflection_text || "");
        setLink(s.submission_link || "");
        setLinkType(s.submission_type || "github");
        setApproach(s.approach_text || "");
        if (s.submission_type === "pdf_design") {
          setUxTab("pdf");
          if (s.submission_link) {
            const fname = s.submission_link.split("/").pop() || "design.pdf";
            setUploadedFileName(decodeURIComponent(fname));
          }
        }
      }
    })();
  }, [id, user, navigate]);

  if (loading || !user || !project) {
    return <AppShell><div className="text-muted-foreground">Loading…</div></AppShell>;
  }

  const isOwner = project.user_id === user.id;

  const upsertSubmission = async (status: "draft" | "submitted") => {
    if (!isOwner) return null;
    const payload = {
      user_id: user.id,
      project_id: project.id,
      problem_understanding: problemUnderstanding,
      proposed_solution: proposedSolution,
      tradeoffs,
      success_metrics: successMetrics,
      reflection_text: reflection,
      submission_link: link || null,
      submission_type: linkType,
      approach_text: approach,
      status,
    };
    let row;
    if (sub) {
      const { data, error } = await supabase.from("submissions").update(payload).eq("id", sub.id).select().single();
      if (error) throw error;
      row = data;
    } else {
      const { data, error } = await supabase.from("submissions").insert(payload).select().single();
      if (error) throw error;
      row = data;
    }
    setSub(row as Submission);
    return row as Submission;
  };

  const saveDraft = async () => {
    setSaving(true);
    try { await upsertSubmission("draft"); toast.success("Draft saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  };

  const submitForGrading = async () => {
    if (!proposedSolution.trim()) { toast.error("Add your proposed solution before submitting"); return; }
    setGrading(true);
    try {
      const submitted = await upsertSubmission("submitted");
      if (!submitted) return;
      const { data, error } = await supabase.functions.invoke("grade-submission", {
        body: {
          role: roleName,
          level: project.difficulty_level,
          project: {
            title: project.title,
            problem_statement: project.problem_statement,
            context: project.context,
            deliverables: project.deliverables,
            evaluation_rubric: project.evaluation_rubric,
          },
          submission: submitted,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const { code_review, authenticity, mentor_review_required, code_criteria_scores, score, feedback } = data;
      const { data: graded, error: uErr } = await supabase
        .from("submissions")
        .update({
          status: "graded",
          ai_score: score,
          ai_feedback: feedback,
          ai_meta: { code_review, authenticity, mentor_review_required, code_criteria_scores },
        })
        .eq("id", submitted.id)
        .select()
        .single();
      if (uErr) throw uErr;
      setSub(graded as Submission);
      toast.success(`Graded: ${score}/100`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Grading failed");
    } finally {
      setGrading(false);
    }
  };

  const handlePdfUpload = async (file: File) => {
    if (!user) return;
    if (file.type !== "application/pdf") { toast.error("Only PDF files are allowed"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("PDF must be 10MB or less"); return; }
    setUploading(true);
    setUploadProgress(10);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${project.id}-${Date.now()}-${safeName}`;
      setUploadProgress(40);
      const { error: upErr } = await supabase.storage.from("submissions").upload(path, file, {
        cacheControl: "3600", upsert: true, contentType: "application/pdf",
      });
      if (upErr) throw upErr;
      setUploadProgress(80);
      const { data: pub } = supabase.storage.from("submissions").getPublicUrl(path);
      setLink(pub.publicUrl);
      setLinkType("pdf_design");
      setUploadedFileName(file.name);
      setUploadProgress(100);
      toast.success("PDF uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1200);
    }
  };

  const isUxDesigner = roleName === "UX Designer";
  const codeScores = sub?.ai_meta?.code_criteria_scores;

  return (
    <AppShell>
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>

      <article className="mt-4 rounded-3xl border border-border bg-card p-8">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {project.domain && <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">{project.domain}</span>}
          {project.focus_area && <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">{project.focus_area}</span>}
          {project.difficulty_level && (() => {
            const l = project.difficulty_level.toLowerCase();
            const cls = l === "beginner" ? "bg-success/15 text-success" : l === "advanced" ? "bg-destructive/15 text-destructive" : "bg-accent/20 text-accent-foreground";
            return <span className={`rounded-full px-2.5 py-1 font-medium capitalize ${cls}`}>{project.difficulty_level}</span>;
          })()}
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">{project.title}</h1>

        <Section title="Problem">{project.problem_statement}</Section>
        {project.context && <Section title="Context">{project.context}</Section>}
        {project.deliverables && <Section title="Deliverables">{project.deliverables}</Section>}
        {project.evaluation_rubric && <Section title="Evaluation rubric">{project.evaluation_rubric}</Section>}
      </article>

      {sub?.status === "graded" && sub.ai_feedback && (
        <article className="mt-6 rounded-3xl border border-border bg-card p-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">AI Feedback</h2>
            <span className="rounded-full bg-success/15 px-3 py-1 text-sm font-medium text-success">{sub.ai_score}/100</span>
          </div>

          {sub.ai_meta?.authenticity && (() => {
            const a = sub.ai_meta.authenticity;
            if (a.authenticity_score < 50) {
              return (
                <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  <div className="font-semibold">AI-generated answers detected — submission flagged for manual review</div>
                  <div className="mt-1 text-destructive/80">{a.reasoning}</div>
                </div>
              );
            }
            if (a.authenticity_score < 80) {
              return (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-sm font-medium text-accent-foreground">
                  ⚠ Authenticity unclear — mentor will verify
                </div>
              );
            }
            return (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-success/15 px-3 py-1 text-sm font-medium text-success">
                Authentic ✓
              </div>
            );
          })()}

          {sub.ai_meta?.code_review && (
            <div className="mt-4 rounded-2xl border border-border bg-background p-5">
              <div className="flex flex-wrap items-center gap-2">
                {sub.ai_meta.code_review.repo_mismatch ? (
                  <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">Repository mismatch detected</span>
                ) : sub.ai_meta.code_review.repo_relevant ? (
                  <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">Repository verified ✓</span>
                ) : sub.ai_meta.code_review.repo_accessible ? (
                  <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent-foreground">Repository accessed — relevance unclear</span>
                ) : (
                  <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">Repository not accessible</span>
                )}
                {sub.ai_meta.code_review.answers_match_code === false && (
                  <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">Answers inconsistent with code</span>
                )}
              </div>
              {sub.ai_meta.code_review.files_reviewed?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {sub.ai_meta.code_review.files_reviewed.map((f) => (
                    <span key={f} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground">{f}</span>
                  ))}
                </div>
              )}
              {sub.ai_meta.code_review.code_quality_observation && (
                <p className="mt-3 text-sm leading-relaxed text-foreground">{sub.ai_meta.code_review.code_quality_observation}</p>
              )}
              {sub.ai_meta.code_review.inconsistencies_found?.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-destructive">
                  {sub.ai_meta.code_review.inconsistencies_found.map((i, idx) => <li key={idx}>{i}</li>)}
                </ul>
              )}
            </div>
          )}

          {sub.ai_meta?.mentor_review_required && (
            <div className="mt-4 rounded-xl border border-accent/40 bg-accent/10 p-3 text-sm text-accent-foreground">
              Authenticity flag: answers show patterns consistent with AI generation. Mentor review recommended.
            </div>
          )}

          <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">{sub.ai_feedback}</pre>
        </article>
      )}

      {isOwner && (
        <article className="mt-6 rounded-3xl border border-border bg-card p-8">
          <h2 className="font-display text-2xl font-semibold">Your submission</h2>
          <p className="mt-2 text-sm text-muted-foreground">Walk through your thinking. The AI reviewer will read every section.</p>

          <div className="mt-6 space-y-5">
            <Textarea label="Problem understanding" value={problemUnderstanding} onChange={setPU} placeholder="Restate the problem in your own words. What are the constraints?" />
            <Textarea label="Proposed solution" value={proposedSolution} onChange={setPS} placeholder="Your approach, design, decisions…" rows={6} />
            <Textarea label="Tradeoffs" value={tradeoffs} onChange={setTO} placeholder="What did you consider but reject? Why?" />
            <Textarea label="Success metrics" value={successMetrics} onChange={setSM} placeholder="How would you measure success?" />
            <Textarea label="Reflection" value={reflection} onChange={setRefl} placeholder="What would you do differently with more time?" />
            <Textarea label="Approach overview (optional)" value={approach} onChange={setApproach} placeholder="A short summary of your overall approach for the portfolio." rows={3} />

            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Submission link</label>
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://github.com/you/project or a doc link"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="github">GitHub</option>
                  <option value="gdoc">Google Doc</option>
                  <option value="notion">Notion</option>
                  <option value="figma">Figma</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button onClick={saveDraft} disabled={saving} className="rounded-xl border border-border bg-background px-5 py-3 text-sm font-medium hover:bg-muted disabled:opacity-50">
              {saving ? "Saving…" : "Save draft"}
            </button>
            <button onClick={submitForGrading} disabled={grading} className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {grading ? "Submitting & grading…" : "Submit for AI grading"}
            </button>
            {sub && <span className="text-xs text-muted-foreground">Status: <span className="font-medium capitalize text-foreground">{sub.status}</span></span>}
          </div>
        </article>
      )}
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

function Textarea({
  label, value, onChange, placeholder, rows = 4,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/40"
      />
    </div>
  );
}
