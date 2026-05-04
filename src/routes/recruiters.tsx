import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { UpgradeModal } from "@/components/UpgradeModal";
import { toast } from "sonner";

interface Recruiter {
  id: string;
  name: string;
  company: string;
  company_size: string | null;
  hiring_for_role: string | null;
  email: string;
  is_subscribed: boolean;
  subscription_plan: string | null;
  saved_searches: Array<{ name: string; role?: string; level?: string; hire?: string }> | null;
}

export const Route = createFileRoute("/recruiters")({
  component: RecruitersPage,
});

function RecruitersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [recruiter, setRecruiter] = useState<Recruiter | null>(null);
  const [contactedCount, setContactedCount] = useState(0);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [companySize, setCompanySize] = useState("1-10");
  const [hiringFor, setHiringFor] = useState("software-engineer");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [searchRole, setSearchRole] = useState("");
  const [searchLevel, setSearchLevel] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    supabase.from("recruiters").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setRecruiter(data as unknown as Recruiter);
    });
  }, [user]);

  useEffect(() => {
    if (!recruiter?.id) return;
    supabase.from("recruiter_contacts").select("id", { count: "exact", head: true }).eq("recruiter_id", recruiter.id)
      .then(({ count }) => setContactedCount(count || 0));
  }, [recruiter?.id]);

  if (loading) return <AppShell><div className="text-muted-foreground">Loading…</div></AppShell>;

  if (!user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-8 text-center">
          <h1 className="font-display text-3xl font-semibold">For recruiters</h1>
          <p className="mt-3 text-muted-foreground">Sign in to create your recruiter profile and save searches.</p>
          <Link to="/auth" search={{ type: "recruiter" } as any} className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
            Sign up / Sign in
          </Link>
        </div>
      </AppShell>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("recruiters").insert({
        user_id: user.id, name, company, company_size: companySize, hiring_for_role: hiringFor, email,
      }).select().single();
      if (error) throw error;
      setRecruiter(data as unknown as Recruiter);
      toast.success("Recruiter profile created");
      navigate({ to: "/portfolios" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSubmitting(false); }
  };

  const addSearch = async () => {
    if (!recruiter || !searchName.trim()) return;
    const newSearch = { name: searchName, role: searchRole || undefined, level: searchLevel || undefined };
    const updated = [...(recruiter.saved_searches || []), newSearch];
    const { error } = await supabase.from("recruiters").update({ saved_searches: updated }).eq("id", recruiter.id);
    if (error) { toast.error(error.message); return; }
    setRecruiter({ ...recruiter, saved_searches: updated });
    setSearchName(""); setSearchRole(""); setSearchLevel("");
    toast.success("Search saved");
  };

  const removeSearch = async (idx: number) => {
    if (!recruiter) return;
    const updated = (recruiter.saved_searches || []).filter((_, i) => i !== idx);
    await supabase.from("recruiters").update({ saved_searches: updated }).eq("id", recruiter.id);
    setRecruiter({ ...recruiter, saved_searches: updated });
  };

  const exportCsv = async () => {
    if (!recruiter?.id) return;
    const { data: contacts } = await supabase.from("recruiter_contacts")
      .select("contacted_at, student_user_id").eq("recruiter_id", recruiter.id);
    if (!contacts || contacts.length === 0) { toast.message("No contacts to export"); return; }
    const ids = contacts.map((c: any) => c.student_user_id);
    const { data: students } = await supabase.from("users").select("id, name, email, college, role").in("id", ids);
    const { data: subs } = await supabase.from("submissions").select("user_id, ai_score").eq("status", "graded").gt("ai_score", 0).in("user_id", ids);
    const scoreBy = new Map<string, number[]>();
    (subs || []).forEach((s: any) => {
      const arr = scoreBy.get(s.user_id) || []; arr.push(s.ai_score); scoreBy.set(s.user_id, arr);
    });
    const rows = (students || []).map((s: any) => {
      const scores = scoreBy.get(s.id) || [];
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      return [s.name || "", s.email || "", s.college || "", s.role || "", avg];
    });
    const csv = ["Name,Email,College,Role,Portfolio Score", ...rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `candidates_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!recruiter) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl">
          <h1 className="font-display text-4xl font-semibold">Set up your recruiter profile</h1>
          <p className="mt-3 text-muted-foreground">Find verified candidates building real projects in your domain.</p>

          <form onSubmit={submit} className="mt-8 space-y-4 rounded-3xl border border-border bg-card p-6">
            <Field label="Your name" value={name} onChange={setName} required />
            <Field label="Company" value={company} onChange={setCompany} required />
            <div>
              <label className="text-xs font-medium text-muted-foreground">Company size</label>
              <select value={companySize} onChange={(e) => setCompanySize(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm">
                {["1-10","11-50","51-200","201-1000","1000+"].map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Hiring for role</label>
              <select value={hiringFor} onChange={(e) => setHiringFor(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm">
                <option value="product-manager">Product Manager</option>
                <option value="software-engineer">Software Engineer</option>
                <option value="data-analyst">Data Analyst</option>
                <option value="ux-designer">UX Designer</option>
                <option value="business-analyst">Business Analyst</option>
                <option value="qa-engineer">QA Engineer</option>
              </select>
            </div>
            <Field label="Email" value={email} onChange={setEmail} required />
            <button type="submit" disabled={submitting} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {submitting ? "Creating…" : "Create recruiter profile"}
            </button>
          </form>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl font-semibold">Welcome, {recruiter.name}</h1>
        {recruiter.is_subscribed && (
          <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
            ● Active Subscription{recruiter.subscription_plan ? ` · ${recruiter.subscription_plan}` : ""}
          </span>
        )}
      </div>
      <p className="mt-2 text-muted-foreground">{recruiter.company} · hiring for <span className="capitalize">{recruiter.hiring_for_role?.replace("-", " ")}</span></p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-sm text-muted-foreground">Candidates Contacted</div>
          <div className="mt-1 font-display text-3xl font-semibold">{contactedCount}</div>
        </div>
        {recruiter.is_subscribed ? (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-sm text-muted-foreground">Export</div>
            <button onClick={exportCsv} className="mt-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              Export Shortlist as CSV
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-accent/40 bg-accent/10 p-5">
            <div className="font-medium">Unlock full access</div>
            <p className="mt-1 text-sm text-muted-foreground">View complete portfolios and contact candidates directly.</p>
            <Link to="/pricing" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">See pricing →</Link>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold">Saved searches</h2>
          {!recruiter.saved_searches?.length ? (
            <p className="mt-3 text-sm text-muted-foreground">No saved searches yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recruiter.saved_searches.map((s, i) => (
                <li key={i} className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
                  <button
                    onClick={() => navigate({ to: "/portfolios", search: { role: s.role, level: s.level, hire: s.hire } })}
                    className="text-left hover:text-primary"
                  >
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.role || "any role"} · {s.level || "any level"}</div>
                  </button>
                  <button onClick={() => removeSearch(i)} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold">+ Save a new search</h2>
          <div className="mt-4 space-y-3">
            <Field label="Name" value={searchName} onChange={setSearchName} placeholder="e.g. Junior PMs in Bangalore" />
            <div>
              <label className="text-xs font-medium text-muted-foreground">Role</label>
              <select value={searchRole} onChange={(e) => setSearchRole(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm">
                <option value="">Any</option>
                <option value="product-manager">Product Manager</option>
                <option value="software-engineer">Software Engineer</option>
                <option value="data-analyst">Data Analyst</option>
                <option value="ux-designer">UX Designer</option>
                <option value="business-analyst">Business Analyst</option>
                <option value="qa-engineer">QA Engineer</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Level</label>
              <select value={searchLevel} onChange={(e) => setSearchLevel(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm">
                <option value="">Any</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <button onClick={addSearch} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
              Save search
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Link to="/portfolios" className="rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background hover:opacity-90">
          Browse all portfolios →
        </Link>
        {!recruiter.is_subscribed && (
          <button onClick={() => setUpgradeOpen(true)} className="rounded-xl border border-border bg-accent/20 px-5 py-3 text-sm font-medium text-accent-foreground hover:bg-accent/30">
            ⭐ Upgrade
          </button>
        )}
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </AppShell>
  );
}

function Field({ label, value, onChange, required, placeholder }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
    </div>
  );
}
