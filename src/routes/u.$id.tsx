import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";

interface Profile {
  id: string;
  name: string | null;
  city: string | null;
  college: string | null;
  bio: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  role: string | null;
  level: string | null;
}
interface Portfolio {
  user_id: string;
  is_public: boolean;
  headline: string | null;
  is_available_for_hire: boolean;
}
interface SubRow {
  id: string;
  status: string;
  ai_score: number | null;
  ai_feedback: string | null;
  approach_text: string | null;
  proposed_solution: string | null;
  submission_link: string | null;
  submission_type: string | null;
  created_at: string;
  projects: { id: string; title: string; domain: string | null; focus_area: string | null; difficulty_level: string | null } | null;
}

export const Route = createFileRoute("/u/$id")({
  component: PublicPortfolio,
});

function PublicPortfolio() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleEmoji, setRoleEmoji] = useState("");
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [editing, setEditing] = useState(false);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
      if (!u) return;
      setProfile(u as Profile);
      setBio(u.bio || "");
      const { data: pf } = await supabase.from("portfolios").select("*").eq("user_id", id).maybeSingle();
      if (pf) {
        setPortfolio(pf as Portfolio);
        setHeadline(pf.headline || "");
        setAvailable(pf.is_available_for_hire);
      }
      if (u.role) {
        const { data: r } = await supabase.from("roles").select("name, icon_emoji").eq("slug", u.role).maybeSingle();
        if (r) { setRoleName(r.name); setRoleEmoji(r.icon_emoji); }
      }
      const { data: s } = await supabase
        .from("submissions")
        .select("id, status, ai_score, ai_feedback, approach_text, proposed_solution, submission_link, submission_type, created_at, projects(id, title, domain, focus_area, difficulty_level)")
        .eq("user_id", id)
        .in("status", ["submitted", "graded"])
        .order("created_at", { ascending: false });
      setSubs((s as unknown as SubRow[]) || []);
    })();
  }, [id]);

  const isOwner = user?.id === id;

  const save = async () => {
    if (!isOwner) return;
    try {
      await supabase.from("users").update({ bio }).eq("id", id);
      await supabase.from("portfolios").update({ headline, is_available_for_hire: available }).eq("user_id", id);
      setProfile((p) => p ? { ...p, bio } : p);
      setPortfolio((pf) => pf ? { ...pf, headline, is_available_for_hire: available } : pf);
      setEditing(false);
      toast.success("Portfolio updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  if (!profile) {
    return <AppShell><div className="text-muted-foreground">Loading…</div></AppShell>;
  }

  if (portfolio && !portfolio.is_public && !isOwner) {
    return <AppShell><p className="text-muted-foreground">This portfolio is private.</p></AppShell>;
  }

  return (
    <AppShell>
      <div className="rounded-3xl border border-border bg-card p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 font-display text-3xl font-semibold text-primary">
            {profile.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">{profile.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.city}{profile.college ? ` · ${profile.college}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {roleName && <span className="rounded-full bg-muted px-2.5 py-1 font-medium">{roleEmoji} {roleName}</span>}
              {profile.level && <span className="rounded-full bg-accent/20 px-2.5 py-1 font-medium capitalize">{profile.level}</span>}
              {portfolio?.is_available_for_hire && <span className="rounded-full bg-success/15 px-2.5 py-1 font-medium text-success">Available for hire</span>}
            </div>

            {editing ? (
              <div className="mt-5 space-y-3">
                <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm" />
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short bio" rows={3} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
                  Available for hire
                </label>
                <div className="flex gap-2">
                  <button onClick={save} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save</button>
                  <button onClick={() => setEditing(false)} className="rounded-xl border border-border px-4 py-2 text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                {portfolio?.headline && <p className="mt-4 font-display text-lg">{portfolio.headline}</p>}
                {profile.bio && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>}
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  {profile.github_url && <a href={profile.github_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">GitHub ↗</a>}
                  {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">LinkedIn ↗</a>}
                </div>
              </>
            )}
          </div>
          {isOwner && !editing && (
            <button onClick={() => setEditing(true)} className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted">
              Edit
            </button>
          )}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold">Projects</h2>
        {subs.length === 0 ? (
          <p className="mt-4 text-muted-foreground">No submitted projects yet.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {subs.map((s) => (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-6">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {s.projects?.domain && <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">{s.projects.domain}</span>}
                  {s.projects?.difficulty_level && (() => {
                    const l = s.projects.difficulty_level.toLowerCase();
                    const cls = l === "beginner" ? "bg-success/15 text-success" : l === "advanced" ? "bg-destructive/15 text-destructive" : "bg-accent/20 text-accent-foreground";
                    return <span className={`rounded-full px-2.5 py-1 font-medium capitalize ${cls}`}>{s.projects.difficulty_level}</span>;
                  })()}
                  {s.status === "graded" && s.ai_score !== null && (
                    <span className="ml-auto rounded-full bg-success/15 px-2.5 py-1 font-medium text-success">AI score · {s.ai_score}/100</span>
                  )}
                </div>
                <h3 className="mt-3 font-display text-xl font-semibold">{s.projects?.title}</h3>
                {s.approach_text && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.approach_text}</p>}
                {!s.approach_text && s.proposed_solution && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{s.proposed_solution}</p>}
                {s.submission_link && (
                  <a href={s.submission_link} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
                    View {s.submission_type || "submission"} ↗
                  </a>
                )}
                {isOwner && s.projects && (
                  <div className="mt-3">
                    <Link to="/projects/$id" params={{ id: s.projects.id }} className="text-sm text-muted-foreground hover:text-foreground">
                      Open project →
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
