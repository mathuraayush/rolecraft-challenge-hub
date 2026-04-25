import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

interface Role {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_emoji: string;
}

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const LEVELS = [
  { value: "beginner", title: "Beginner", desc: "Just starting out" },
  { value: "intermediate", title: "Intermediate", desc: "Some projects or internships" },
  { value: "advanced", title: "Advanced", desc: "1+ years of experience" },
];

function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [roles, setRoles] = useState<Role[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // step 1
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [city, setCity] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");

  // step 2 + 3
  const [roleId, setRoleId] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    supabase.from("roles").select("*").order("name").then(({ data }) => {
      if (data) setRoles(data);
    });
    if (user) {
      supabase.from("users").select("name, onboarded").eq("id", user.id).maybeSingle().then(({ data }) => {
        if (data?.name) setName(data.name);
        if (data?.onboarded) navigate({ to: "/dashboard" });
      });
    }
  }, [user, navigate]);

  const next = () => setStep((s) => Math.min(3, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const finish = async () => {
    if (!user || !roleId || !level) return;
    setSubmitting(true);
    try {
      const role = roles.find((r) => r.id === roleId);
      const { error: uErr } = await supabase.from("users").upsert({
        id: user.id,
        email: user.email,
        name,
        college,
        city,
        github_url: github || null,
        linkedin_url: linkedin || null,
        role: role?.slug ?? null,
        level,
        onboarded: true,
      });
      if (uErr) throw uErr;
      const { error: pErr } = await supabase.from("portfolios").upsert({
        user_id: user.id,
        is_public: true,
        is_available_for_hire: true,
        headline: `${role?.name} • ${level.charAt(0).toUpperCase() + level.slice(1)}`,
      });
      if (pErr) throw pErr;
      toast.success("Profile saved! Generating your first project…");
      navigate({ to: "/dashboard", search: { generate: "1" } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const canNext = step === 1 ? name && college && city : step === 2 ? !!roleId : !!level;

  return (
    <div className="min-h-screen bg-background">
      <header className="container-narrow flex items-center justify-between py-6">
        <Link to="/" className="font-display text-2xl font-semibold">RoleCraft</Link>
        <span className="text-sm text-muted-foreground">Step {step} of 3</span>
      </header>

      <div className="container-narrow">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      <main className="container-narrow px-5 py-10">
        {step === 1 && (
          <section>
            <h1 className="font-display text-4xl font-semibold sm:text-5xl">Let's set up your RoleCraft profile</h1>
            <p className="mt-3 text-muted-foreground">This becomes your public portfolio — companies will see this.</p>

            <div className="mt-8 grid gap-5 rounded-3xl border border-border bg-card p-6 sm:grid-cols-2">
              <Field label="Full name" value={name} onChange={setName} required />
              <Field label="College" value={college} onChange={setCollege} required />
              <Field label="City" value={city} onChange={setCity} required />
              <div />
              <Field label="GitHub URL (optional)" value={github} onChange={setGithub} placeholder="https://github.com/you" />
              <Field label="LinkedIn URL (optional)" value={linkedin} onChange={setLinkedin} placeholder="https://linkedin.com/in/you" />
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 className="font-display text-4xl font-semibold sm:text-5xl">What role are you training for?</h1>
            <p className="mt-3 text-muted-foreground">Pick the role you want to build a portfolio in.</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {roles.map((r) => {
                const selected = roleId === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setRoleId(r.id)}
                    className={`relative rounded-2xl border-2 bg-card p-6 text-left transition ${
                      selected ? "border-primary shadow-md" : "border-border hover:border-foreground/20"
                    }`}
                  >
                    {selected && (
                      <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7A1 1 0 014.7 8.3l3.1 3.1L15.3 5.3a1 1 0 011.4 0z"/></svg>
                      </div>
                    )}
                    <div className="text-4xl">{r.icon_emoji}</div>
                    <h3 className="mt-4 font-display text-xl font-semibold">{r.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 3 && (
          <section>
            <h1 className="font-display text-4xl font-semibold sm:text-5xl">What's your current level?</h1>
            <p className="mt-3 text-muted-foreground">We'll match the difficulty of your projects.</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {LEVELS.map((l) => {
                const selected = level === l.value;
                return (
                  <button
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    className={`rounded-2xl border-2 bg-card p-6 text-left transition ${
                      selected ? "border-primary shadow-md" : "border-border hover:border-foreground/20"
                    }`}
                  >
                    <h3 className="font-display text-2xl font-semibold">{l.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{l.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <div className="mt-10 flex items-center justify-between">
          {step > 1 ? (
            <button onClick={back} className="rounded-xl px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
              ← Back
            </button>
          ) : <div />}
          {step < 3 ? (
            <button
              onClick={next}
              disabled={!canNext}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={!canNext || submitting}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Generate My First Project →"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

function Field({
  label, value, onChange, required, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
      />
    </div>
  );
}
