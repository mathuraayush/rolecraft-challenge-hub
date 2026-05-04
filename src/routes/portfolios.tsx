import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRecruiter } from "@/lib/useRecruiter";
import { AppShell } from "@/components/AppShell";
import { UpgradeModal } from "@/components/UpgradeModal";
import { sendRecruiterInterest } from "@/server/recruiter.functions";
import { toast } from "sonner";

interface Person {
  id: string;
  name: string | null;
  city: string | null;
  college: string | null;
  role: string | null;
  level: string | null;
  portfolios: { headline: string | null; is_available_for_hire: boolean; is_public: boolean } | null;
}
interface SubAgg { user_id: string; count: number; avg: number; domains: string[]; created_at: string }
interface Role { slug: string; name: string; icon_emoji: string }

const ALL_DOMAINS = ["fintech", "edtech", "healthtech", "consumer", "b2b-saas", "logistics"];
const ALL_LEVELS = ["beginner", "intermediate", "advanced"];

export const Route = createFileRoute("/portfolios")({
  validateSearch: z.object({
    role: z.string().optional(), level: z.string().optional(), hire: z.string().optional(),
  }),
  component: PortfoliosPage,
});

function PortfoliosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { recruiter, isRecruiter, loading: rLoading } = useRecruiter();
  const [people, setPeople] = useState<Person[]>([]);
  const [aggBy, setAggBy] = useState<Map<string, SubAgg>>(new Map());
  const [roles, setRoles] = useState<Role[]>([]);
  const [contacted, setContacted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const sendInterest = useServerFn(sendRecruiterInterest);

  // filters
  const [selRoles, setSelRoles] = useState<string[]>([]);
  const [selLevels, setSelLevels] = useState<string[]>([]);
  const [selDomains, setSelDomains] = useState<string[]>([]);
  const [minScore, setMinScore] = useState(50);
  const [openOnly, setOpenOnly] = useState(false);
  const [sort, setSort] = useState<"score" | "recent" | "projects">("score");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Redirect students away
  useEffect(() => {
    if (!rLoading && user && !isRecruiter) navigate({ to: "/dashboard" });
  }, [rLoading, user, isRecruiter, navigate]);

  useEffect(() => {
    supabase.from("roles").select("slug, name, icon_emoji").then(({ data }) => data && setRoles(data));
  }, []);

  useEffect(() => {
    if (recruiter?.id) {
      supabase.from("recruiter_contacts").select("student_user_id").eq("recruiter_id", recruiter.id)
        .then(({ data }) => setContacted(new Set((data || []).map((r: any) => r.student_user_id))));
    }
  }, [recruiter?.id]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data: u } = await supabase.from("users")
        .select("id, name, city, college, role, level, portfolios(headline, is_available_for_hire, is_public)")
        .eq("onboarded", true).limit(500);
      const { data: subs } = await supabase.from("submissions")
        .select("user_id, ai_score, status, created_at, projects(domain)")
        .eq("status", "graded").gt("ai_score", 0).limit(2000);

      const byUser = new Map<string, SubAgg>();
      ((subs as any[]) || []).forEach((s: any) => {
        const cur: SubAgg = byUser.get(s.user_id) || { user_id: s.user_id, count: 0, avg: 0, domains: [] as string[], created_at: s.created_at };
        cur.count += 1;
        cur.avg = (cur.avg * (cur.count - 1) + (s.ai_score || 0)) / cur.count;
        if (s.projects?.domain && !cur.domains.includes(s.projects.domain)) cur.domains.push(s.projects.domain);
        if (s.created_at > cur.created_at) cur.created_at = s.created_at;
        byUser.set(s.user_id, cur);
      });
      setAggBy(byUser);

      // Show all onboarded users with public portfolios; submissions are optional.
      const rows = ((u as unknown as Person[]) || []).filter((p) =>
        p.portfolios?.is_public !== false
      );
      setPeople(rows);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let rows = people.filter((p) => {
      const a = aggBy.get(p.id);
      const score = a ? Math.round(a.avg) : 0;
      const domains = a?.domains || [];
      if (selRoles.length && (!p.role || !selRoles.includes(p.role))) return false;
      if (selLevels.length && (!p.level || !selLevels.includes(p.level))) return false;
      if (selDomains.length && !domains.some((d) => selDomains.includes(d))) return false;
      if (score < minScore) return false;
      if (openOnly && !p.portfolios?.is_available_for_hire) return false;
      return true;
    });
    const scoreOf = (id: string) => aggBy.get(id)?.avg ?? 0;
    const countOf = (id: string) => aggBy.get(id)?.count ?? 0;
    const recentOf = (id: string) => aggBy.get(id)?.created_at ?? "";
    if (sort === "score") rows.sort((a, b) => scoreOf(b.id) - scoreOf(a.id));
    else if (sort === "recent") rows.sort((a, b) => recentOf(b.id).localeCompare(recentOf(a.id)));
    else rows.sort((a, b) => countOf(b.id) - countOf(a.id));
    return rows;
  }, [people, aggBy, selRoles, selLevels, selDomains, minScore, openOnly, sort]);

  const handleInterested = async (studentId: string) => {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!isRecruiter) { navigate({ to: "/recruiters" }); return; }
    if (!recruiter?.is_subscribed) { setUpgradeOpen(true); return; }
    if (contacted.has(studentId)) return;
    setSendingId(studentId);
    try {
      const r = await sendInterest({ data: { recruiter_id: recruiter.id, student_user_id: studentId } });
      if ((r as any).success) {
        setContacted((s) => new Set([...s, studentId]));
        toast.success("Email sent. They'll reply to your email directly.");
      } else if ((r as any).status === 403) setUpgradeOpen(true);
      else if ((r as any).error === "Already contacted") toast.message("You've already contacted this candidate.");
      else if ((r as any).error === "Student not available") toast.message("This candidate is not open to contact.");
      else toast.error((r as any).error || "Failed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSendingId(null); }
  };

  const subscribed = !!recruiter?.is_subscribed;
  const showFreeBanner = isRecruiter && !subscribed;

  if (!user) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <h1 className="font-display text-5xl font-semibold">Find Your Next Hire</h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Browse verified project portfolios from emerging talent across India. Hire on proof of work, not pedigree.
          </p>
          <div className="mt-8 flex gap-4 justify-center">
            <Link to="/auth" search={{ type: "recruiter" } as any} className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90">
              Sign in as Recruiter →
            </Link>
            <Link to="/pricing" className="rounded-xl border border-border bg-card px-6 py-3 font-medium hover:bg-muted">
              View pricing
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Free to browse · No placement fees · Cancel anytime</p>
          <div className="mt-12 grid gap-4 md:grid-cols-3 max-w-3xl mx-auto">
            {[1,2,3].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 text-left blur-sm select-none">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10" />
                  <div>
                    <div className="font-display text-lg font-semibold">Candidate Name</div>
                    <div className="text-xs text-muted-foreground">College · City</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-1.5 text-xs">
                  <span className="rounded-full bg-muted px-2 py-0.5">Role</span>
                  <span className="rounded-full bg-accent/20 px-2 py-0.5">Level</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">5 projects graded · score 87</p>
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }


  return (
    <AppShell>
      <div>
        <h1 className="font-display text-5xl font-semibold">Find Your Next Hire</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          Verified project portfolios from emerging talent. Hire on proof of work, not pedigree.
        </p>
      </div>

      {showFreeBanner && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-5 py-4 text-sm">
          <span className="text-accent-foreground">
            You are on the free plan. Upgrade to view full portfolios and contact candidates.
          </span>
          <button onClick={() => setUpgradeOpen(true)} className="rounded-xl bg-accent px-4 py-2 text-xs font-medium text-accent-foreground hover:opacity-90">
            → Upgrade now
          </button>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Filters */}
        <aside>
          <button onClick={() => setFiltersOpen(!filtersOpen)} className="mb-3 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm lg:hidden">
            Filters {filtersOpen ? "▲" : "▼"}
          </button>
          <div className={`${filtersOpen ? "block" : "hidden"} space-y-6 lg:block`}>
            <FilterSection title="Role">
              {roles.map((r) => (
                <Check key={r.slug} checked={selRoles.includes(r.slug)}
                  onChange={(c) => setSelRoles((s) => c ? [...s, r.slug] : s.filter((x) => x !== r.slug))}
                  label={`${r.icon_emoji} ${r.name}`} />
              ))}
            </FilterSection>

            <FilterSection title="Level">
              {ALL_LEVELS.map((l) => (
                <Check key={l} checked={selLevels.includes(l)}
                  onChange={(c) => setSelLevels((s) => c ? [...s, l] : s.filter((x) => x !== l))}
                  label={l} />
              ))}
            </FilterSection>

            <FilterSection title={`Min Portfolio Score: ${minScore}`}>
              <input type="range" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-full" />
            </FilterSection>

            <FilterSection title="Domain">
              {ALL_DOMAINS.map((d) => (
                <Check key={d} checked={selDomains.includes(d)}
                  onChange={(c) => setSelDomains((s) => c ? [...s, d] : s.filter((x) => x !== d))}
                  label={d} />
              ))}
            </FilterSection>

            <FilterSection title="Availability">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} />
                Open to opportunities only
              </label>
            </FilterSection>

            <FilterSection title="Sort">
              <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
                <option value="score">Highest Score</option>
                <option value="recent">Most Recent</option>
                <option value="projects">Most Projects</option>
              </select>
            </FilterSection>
          </div>
        </aside>

        {/* Cards */}
        <div>
          {loading ? <p className="text-muted-foreground">Loading…</p> : filtered.length === 0 ? (
            <p className="text-muted-foreground">No portfolios match these filters yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((p) => {
                const a = aggBy.get(p.id)!;
                const score = Math.round(a.avg);
                const role = roles.find((r) => r.slug === p.role);
                const isContacted = contacted.has(p.id);
                const sending = sendingId === p.id;
                const scoreColor = score >= 80 ? "text-success" : score >= 60 ? "text-primary" : "text-accent-foreground";
                return (
                  <div key={p.id} className="rounded-2xl border border-border bg-card p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-semibold text-primary">
                        {p.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-lg font-semibold">{p.name || "Anonymous"}</span>
                          {p.portfolios?.is_available_for_hire && <span className="h-2 w-2 rounded-full bg-success" title="Available" />}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.college}{p.city ? ` · ${p.city}` : ""}
                        </div>
                      </div>
                      <div className={`text-right font-display text-2xl font-semibold ${scoreColor}`}>{score}</div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                      {role && <span className="rounded-full bg-muted px-2 py-0.5">{role.icon_emoji} {role.name}</span>}
                      {p.level && <span className="rounded-full bg-accent/20 px-2 py-0.5 capitalize">{p.level}</span>}
                      {a.domains.slice(0, 3).map((d) => (
                        <span key={d} className="rounded-full bg-secondary px-2 py-0.5">{d}</span>
                      ))}
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      {a.count} {a.count === 1 ? "project" : "projects"} graded
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Link to="/u/$id" params={{ id: p.id }} className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-center text-sm font-medium hover:bg-muted">
                        View Portfolio →
                      </Link>
                      {!user ? (
                        <Link to="/auth" className="flex-1 rounded-xl bg-primary/90 px-3 py-2 text-center text-sm font-medium text-primary-foreground">
                          Sign in to contact
                        </Link>
                      ) : isContacted ? (
                        <button disabled className="flex-1 rounded-xl bg-success/20 px-3 py-2 text-sm font-medium text-success">Interest Sent ✓</button>
                      ) : (
                        <button onClick={() => handleInterested(p.id)} disabled={sending}
                          className="flex-1 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
                          {sending ? "Sending…" : "Interested"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </AppShell>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Check({ checked, onChange, label }: { checked: boolean; onChange: (c: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm capitalize cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
