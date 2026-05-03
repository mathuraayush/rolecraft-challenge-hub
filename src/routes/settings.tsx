import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useRecruiter } from "@/lib/useRecruiter";
import { AppShell } from "@/components/AppShell";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, loading } = useAuth();
  const { isRecruiter, loading: rLoading } = useRecruiter();
  const navigate = useNavigate();
  const [available, setAvailable] = useState(true);
  const [allowContact, setAllowContact] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!rLoading && isRecruiter) navigate({ to: "/portfolios" });
  }, [rLoading, isRecruiter, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: u }, { data: pf }] = await Promise.all([
        supabase.from("users").select("allow_recruiter_contact").eq("id", user.id).maybeSingle(),
        supabase.from("portfolios").select("is_available_for_hire").eq("user_id", user.id).maybeSingle(),
      ]);
      setAllowContact(u?.allow_recruiter_contact ?? true);
      setAvailable(pf?.is_available_for_hire ?? true);
      setReady(true);
    })();
  }, [user]);

  const updateAvailable = async (v: boolean) => {
    setAvailable(v);
    await supabase.from("portfolios").update({ is_available_for_hire: v }).eq("user_id", user!.id);
    toast.success("Updated");
  };
  const updateAllow = async (v: boolean) => {
    setAllowContact(v);
    await supabase.from("users").update({ allow_recruiter_contact: v }).eq("id", user!.id);
    toast.success("Updated");
  };

  if (!ready) return <AppShell><p className="text-muted-foreground">Loading…</p></AppShell>;

  return (
    <AppShell>
      <h1 className="font-display text-4xl font-semibold">Settings</h1>

      <section className="mt-10 rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display text-2xl font-semibold">Recruiter Contact Preferences</h2>

        <ToggleRow
          label="Open to opportunities"
          subtext="Shows a green dot on your portfolio card in the recruiter browse page."
          value={available} onChange={updateAvailable}
        />

        <div className="mt-6 border-t border-border pt-6">
          <ToggleRow
            label="Allow recruiters to contact me"
            subtext="When on, subscribed recruiters can send you one email expressing interest. You are never obligated to respond."
            value={allowContact} onChange={updateAllow}
          />
          {!allowContact && (
            <div className="mt-3 rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-accent-foreground">
              ⚠ Recruiters will not be able to send you interest emails. Your portfolio remains visible.
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}

function ToggleRow({ label, subtext, value, onChange }: { label: string; subtext: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="mt-4 flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{subtext}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? "bg-primary" : "bg-muted"}`}
        aria-label={label}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${value ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
