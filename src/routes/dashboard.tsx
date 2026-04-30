import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";

interface Project {
  id: string;
  title: string;
  problem_statement: string;
  domain: string | null;
  focus_area: string | null;
  difficulty_level: string | null;
  created_at: string;
}

interface Submission {
  id: string;
  project_id: string;
  status: string;
  ai_score: number | null;
  ai_feedback: string | null;
}

interface UserRow {
  name: string | null;
  role: string | null;
  level: string | null;
  onboarded: boolean;
}

function difficultyBadgeClass(level: string | null): string {
  const l = (level || "").toLowerCase();
  if (l === "beginner") return "bg-success/15 text-success";
  if (l === "advanced") return "bg-destructive/15 text-destructive";
  return "bg-accent/20 text-accent-foreground"; // intermediate + fallback = amber
}

export const Route = createFileRoute("/dashboard")({
  validateSearch: z.object({ generate: z.string().optional() }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [roleName, setRoleName] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [{ data: u }, { data: ps }, { data: subs }] = await Promise.all([
      supabase.from("users").select("name, role, level, onboarded").eq("id", user.id).maybeSingle(),
      supabase.from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("submissions").select("id, project_id, status, ai_score, ai_feedback").eq("user_id", user.id),
    ]);
    if (u && !u.onboarded) {
      navigate({ to: "/onboarding" });
      return;
    }
    setProfile(u as UserRow | null);
    setProjects((ps as Project[]) || []);
    setSubmissions((subs as Submission[]) || []);
    if (u?.role) {
      const { data: r } = await supabase.from("roles").select("name").eq("slug", u.role).maybeSingle();
      if (r) setRoleName(r.name);
    }
  }, [user, navigate]);

  useEffect(() => { refresh(); }, [refresh]);

  const generate = useCallback(async () => {
    if (!user || !profile?.role || !profile.level) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-project", {
        body: { roleName, roleSlug: profile.role, level: profile.level },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const p = data.project;

      const { data: roleRow } = await supabase.from("roles").select("id").eq("slug", profile.role).maybeSingle();
      const { data: inserted, error: insErr } = await supabase.from("projects").insert({
        user_id: user.id,
        role_id: roleRow?.id ?? null,
        title: p.title,
        problem_statement: p.problem_statement,
        context: p.context,
        deliverables: p.deliverables,
        evaluation_rubric: p.evaluation_rubric,
        difficulty_level: p.difficulty_level,
        domain: p.domain,
        focus_area: p.focus_area,
      }).select().single();
      if (insErr) throw insErr;
      toast.success("New project ready!");
      navigate({ to: "/projects/$id", params: { id: inserted.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate project");
    } finally {
      setGenerating(false);
    }
  }, [user, profile, roleName, navigate]);

  // auto-generate first project when arriving from onboarding
  useEffect(() => {
    if (search.generate && profile && projects.length === 0 && !generating) {
      generate();
      navigate({ to: "/dashboard", search: {}, replace: true });
    }
  }, [search.generate, profile, projects.length, generating, generate, navigate]);

  if (loading || !user || !profile) {
    return <AppShell><div className="text-muted-foreground">Loading…</div></AppShell>;
  }

  const subByProject = new Map(submissions.map((s) => [s.project_id, s]));

  return (
    <AppShell>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-4xl font-semibold">Hi, {profile.name?.split(" ")[0] || "there"} 👋</h1>
          <p className="mt-2 text-muted-foreground">
            Training as <span className="font-medium text-foreground">{roleName || "—"}</span> · level{" "}
            <span className="font-medium text-foreground capitalize">{profile.level}</span>
          </p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {generating ? "Generating…" : "+ Generate new project"}
        </button>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">Your projects</h2>
        {projects.length === 0 && !generating && (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-muted-foreground">No projects yet.</p>
            <button onClick={generate} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
              Generate my first project
            </button>
          </div>
        )}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {projects.map((p) => {
            const sub = subByProject.get(p.id);
            return (
              <Link
                key={p.id}
                to="/projects/$id"
                params={{ id: p.id }}
                className="group rounded-2xl border border-border bg-card p-6 transition hover:border-foreground/20 hover:shadow-md"
              >
                <div className="flex items-center gap-2 text-xs">
                  {p.domain && <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">{p.domain}</span>}
                  {p.difficulty_level && <span className={`rounded-full px-2.5 py-1 font-medium capitalize ${difficultyBadgeClass(p.difficulty_level)}`}>{p.difficulty_level}</span>}
                  {sub?.status === "graded" && (
                    <span className="ml-auto rounded-full bg-success/15 px-2.5 py-1 font-medium text-success">
                      Graded · {sub.ai_score}/100
                    </span>
                  )}
                  {sub?.status === "submitted" && (
                    <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">Submitted</span>
                  )}
                  {sub?.status === "draft" && (
                    <span className="ml-auto rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">Draft</span>
                  )}
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold group-hover:text-primary">{p.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.problem_statement}</p>
              </Link>
            );
          })}
          {generating && (
            <div className="rounded-2xl border border-dashed border-border bg-card p-6">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-4 h-5 w-3/4 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
              <p className="mt-4 text-xs text-muted-foreground">AI is crafting a project for you…</p>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
