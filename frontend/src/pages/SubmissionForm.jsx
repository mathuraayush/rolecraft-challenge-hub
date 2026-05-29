import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { api } from "../lib/api";
import { useToast } from "../components/ToastProvider";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const SubmissionForm = () => {
  const { submissionId } = useParams();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState("github");
  const [file, setFile] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/submissions/${submissionId}`).then(setSubmission).catch(() => setSubmission(null)).finally(() => setLoading(false));
  }, [submissionId]);

  const project = submission?.project_id;
  const role = project?.role_id?.name?.toLowerCase() || "";
  const defaultType = useMemo(() => {
    if (role.includes("software") || role.includes("data")) return "github";
    if (role.includes("ux")) return "figma";
    return "gdoc";
  }, [role]);

  useEffect(() => {
    if (submission) {
      setMode(submission.submission_type || defaultType);
    }
  }, [submission, defaultType]);

  const editValue = (field) => (event) => setSubmission((current) => ({ ...current, [field]: event.target.value }));

  const saveDraft = async () => {
    if (!submission) return;
    setSaving(true);
    try {
      await api.put(`/submissions/${submissionId}`, {
        approach_text: submission.approach_text,
        problem_understanding: submission.problem_understanding,
        proposed_solution: submission.proposed_solution,
        tradeoffs: submission.tradeoffs,
        success_metrics: submission.success_metrics,
        reflection_text: submission.reflection_text,
        submission_link: submission.submission_link,
        submission_type: submission.submission_type,
      });
      toast.pushToast("Draft saved", "success");
    } catch (error) {
      toast.pushToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const uploadPdf = async () => {
    if (!file) return null;
    const formData = new FormData();
    formData.append("file", file);
    const payload = await api.postForm("/upload/submission", formData);
    return payload.url;
  };

  const handleSubmit = async () => {
    if (!submission) return;
    setSubmitting(true);
    try {
      let submissionLink = submission.submission_link;
      if (role.includes("ux") && mode === "figma") {
        submissionLink = submission.submission_link;
      }
      if (role.includes("ux") && mode === "figma-pdf" && file) {
        submissionLink = await uploadPdf();
      }
      await api.put(`/submissions/${submissionId}`, {
        approach_text: submission.approach_text,
        problem_understanding: submission.problem_understanding,
        proposed_solution: submission.proposed_solution,
        tradeoffs: submission.tradeoffs,
        success_metrics: submission.success_metrics,
        reflection_text: submission.reflection_text,
        submission_link: submissionLink,
        submission_type: mode === "figma-pdf" ? "figma" : mode,
      });
      await api.post(`/submissions/${submissionId}/submit`);
      const graded = await api.post(`/submissions/${submissionId}/grade`);
      setSubmission(graded);
      toast.pushToast("Submission graded", "success");
    } catch (error) {
      toast.pushToast(error.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="space-y-4"><div className="h-48 animate-pulse rounded-[32px] bg-slate-200" /></div>;
  }

  if (!submission || !project) {
    return <p className="rounded-[32px] border border-slate-200/40 bg-white/90 p-8 text-slate-700">Submission not found.</p>;
  }

  const statusColors = {
    draft: "bg-slate-800 text-white",
    submitted: "bg-indigo-600 text-white",
    graded: "bg-emerald-500 text-slate-950",
  };

  return (
    <div className="space-y-8">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-600">Submission</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">{project.title}</h1>
          </div>
          <span className={`rounded-full px-4 py-2 text-sm font-semibold ${statusColors[submission.status] || "bg-slate-800 text-white"}`}>{submission.status}</span>
        </div>
        {submission.rejection_reason && (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">
            <p className="font-semibold">Action required</p>
            <ReactMarkdown>{submission.rejection_reason}</ReactMarkdown>
          </div>
        )}
      </Card>

      <Card>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-slate-950">Challenge brief</h2>
            <Badge variant="subtle">{project.difficulty_level}</Badge>
          </div>
          <details className="rounded-3xl border border-slate-800 bg-slate-950/90 p-5 text-slate-100">
            <summary className="cursor-pointer text-sm font-semibold">View Challenge</summary>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-200">
              <p>{project.problem_statement}</p>
              <p>{project.context}</p>
              <p>{project.deliverables}</p>
            </div>
          </details>
        </div>
      </Card>

      <Card className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-100">
            Problem understanding
            <Textarea value={submission.problem_understanding} onChange={editValue("problem_understanding")} required />
          </label>
          <label className="space-y-2 text-sm text-slate-100">
            Proposed solution
            <Textarea value={submission.proposed_solution} onChange={editValue("proposed_solution")} required />
          </label>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-100">
            Tradeoffs
            <Textarea value={submission.tradeoffs} onChange={editValue("tradeoffs")} required />
          </label>
          <label className="space-y-2 text-sm text-slate-100">
            Success metrics
            <Textarea value={submission.success_metrics} onChange={editValue("success_metrics")} required />
          </label>
        </div>
        <label className="space-y-2 text-sm text-slate-100">
          Reflection (optional)
          <Textarea value={submission.reflection_text} onChange={editValue("reflection_text")} />
        </label>
      </Card>

      <Card className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Submission link</p>
            <p className="mt-2 text-sm text-slate-600">Provide the link or upload required assets for your role.</p>
          </div>
          <Badge variant="info">{mode === "figma-pdf" ? "PDF upload" : mode.toUpperCase()}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {role.includes("ux") ? (
            ["figma", "figma-pdf"].map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded-3xl border px-4 py-3 text-left text-sm ${submission.submission_type === option ? "border-indigo-500 bg-indigo-50 text-slate-950" : "border-slate-700 bg-slate-900 text-slate-100 hover:border-indigo-500"}`}
                onClick={() => {
                  setMode(option);
                  setSubmission((current) => ({ ...current, submission_type: option }));
                }}
              >
                {option === "figma" ? "Figma link" : "Upload PDF"}
              </button>
            ))
          ) : (
            <select value={mode} onChange={(event) => setMode(event.target.value)} className="rounded-3xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none">
              {role.includes("software") || role.includes("data") ? (
                <option value="github">GitHub</option>
              ) : (
                <>
                  <option value="gdoc">Google Doc</option>
                  <option value="notion">Notion</option>
                  <option value="other">Other</option>
                </>
              )}
            </select>
          )}
        </div>
        {mode === "figma-pdf" ? (
          <div className="space-y-3">
            <label className="block text-sm text-slate-100">Upload PDF</label>
            <input type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} className="text-sm text-slate-100" />
          </div>
        ) : (
          <label className="space-y-2 text-sm text-slate-100">
            Link
            <Input value={submission.submission_link} onChange={editValue("submission_link")} placeholder="https://" required />
          </label>
        )}
        <p className="text-sm text-slate-500">Written answers are primary for grading.</p>
      </Card>

      <Card className="space-y-6">
        <div className="space-y-3 text-sm text-slate-400">
          <p><span className="font-semibold text-slate-100">Checklist</span> — confirm before submitting.</p>
          <ul className="space-y-2 pl-4 list-disc">
            <li>Answered all fields honestly</li>
            <li>Link is publicly accessible</li>
            <li>Written answers are primary basis</li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={saveDraft} disabled={saving}>{saving ? "Saving..." : "Save Draft"}</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>{submitting ? "Submitting..." : "Submit for review"}</Button>
        </div>
      </Card>

      {submission.status === "graded" && submission.ai_feedback && (
        <Card>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-slate-950">Review results</h2>
              <Badge variant={submission.ai_score >= 80 ? "success" : submission.ai_score >= 60 ? "warning" : "danger"}>{submission.ai_score || 0}/100</Badge>
            </div>
            <div className="space-y-3 text-sm leading-7 text-slate-700">
              <ReactMarkdown>{submission.ai_feedback}</ReactMarkdown>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
