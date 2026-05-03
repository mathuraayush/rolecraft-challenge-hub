import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { requestSubscription } from "@/server/recruiter.functions";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultPlan?: "monthly" | "annual";
}

export function UpgradeModal({ open, onClose, defaultPlan = "monthly" }: Props) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<"monthly" | "annual">(defaultPlan);
  const [stage, setStage] = useState<"plans" | "form" | "success">("plans");
  const [recruiter, setRecruiter] = useState<{ id: string; name: string; company: string } | null>(null);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [hiringCount, setHiringCount] = useState("1-2");
  const [submitting, setSubmitting] = useState(false);
  const submit = useServerFn(requestSubscription);

  useEffect(() => { setPlan(defaultPlan); }, [defaultPlan]);

  useEffect(() => {
    if (!open || !user) return;
    supabase.from("recruiters").select("id, name, company").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRecruiter(data);
          setName(data.name);
          setCompany(data.company);
        }
      });
  }, [open, user]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!recruiter) {
      toast.error("Create a recruiter profile first");
      return;
    }
    setSubmitting(true);
    try {
      const r = await submit({ data: { recruiter_id: recruiter.id, plan_type: plan, phone, hiring_count: hiringCount } });
      if ((r as any).success) setStage("success");
      else toast.error((r as any).error || "Failed to submit");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSubmitting(false); }
  };

  const close = () => { setStage("plans"); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={close}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-card p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="font-display text-3xl font-semibold">
            {stage === "success" ? "Request received! 🎉" : "Unlock recruiter access"}
          </h2>
          <button onClick={close} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        {stage === "plans" && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <PlanCard
              title="Monthly" price="₹2,999/month" features={["Full portfolio access","Contact up to 20 candidates/month","Saved searches with alerts","CSV export"]}
              active={plan === "monthly"} onClick={() => { setPlan("monthly"); setStage("form"); }}
              cta="Request Monthly Access →"
            />
            <PlanCard
              title="Annual" price="₹24,999/year" badge="Save 30%"
              features={["Everything in monthly","Unlimited contacts","Priority matching","Dedicated account manager"]}
              active={plan === "annual"} onClick={() => { setPlan("annual"); setStage("form"); }}
              cta="Request Annual Access →"
            />
          </div>
        )}

        {stage === "form" && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">Selected plan: <span className="font-semibold capitalize text-foreground">{plan}</span></p>
            <Field label="Name" value={name} onChange={setName} />
            <Field label="Company" value={company} onChange={setCompany} />
            <Field label="Phone number" value={phone} onChange={setPhone} required />
            <div>
              <label className="text-xs font-medium text-muted-foreground">How many hires do you plan to make?</label>
              <select value={hiringCount} onChange={(e) => setHiringCount(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm">
                {["1-2", "3-5", "6-10", "10+"].map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStage("plans")} className="rounded-xl border border-border px-4 py-2.5 text-sm">← Back</button>
              <button onClick={handleSubmit} disabled={submitting || !phone} className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {submitting ? "Sending…" : "Send Access Request"}
              </button>
            </div>
          </div>
        )}

        {stage === "success" && (
          <div className="mt-6 text-center">
            <p className="text-base text-muted-foreground">We'll reach out within 24 hours to set up your account.</p>
            <button onClick={close} className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanCard({ title, price, badge, features, active, onClick, cta }: { title: string; price: string; badge?: string; features: string[]; active: boolean; onClick: () => void; cta: string }) {
  return (
    <div className={`rounded-2xl border-2 p-6 ${active ? "border-primary" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold">{title}</h3>
        {badge && <span className="rounded-full bg-accent/20 px-2.5 py-1 text-xs font-medium text-accent-foreground">{badge}</span>}
      </div>
      <p className="mt-2 font-display text-2xl">{price}</p>
      <ul className="mt-4 space-y-2 text-sm">
        {features.map((f) => <li key={f} className="flex gap-2"><span className="text-success">✓</span>{f}</li>)}
      </ul>
      <button onClick={onClick} className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">{cta}</button>
    </div>
  );
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}{required && " *"}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} required={required} className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
    </div>
  );
}
