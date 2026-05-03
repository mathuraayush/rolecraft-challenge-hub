import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { UpgradeModal } from "@/components/UpgradeModal";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — RoleCraft" },
      { name: "description", content: "Simple recruiter pricing. Free to browse. Pay only when you're ready to connect." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<"monthly" | "annual">("monthly");

  const openModal = (p: "monthly" | "annual") => { setPlan(p); setOpen(true); };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="font-display text-5xl font-semibold">Simple pricing for recruiters</h1>
        <p className="mt-4 text-lg text-muted-foreground">Free to browse. Pay only when you're ready to connect.</p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        <PlanColumn title="Free" price="₹0 forever"
          features={[["✓","Browse all candidate portfolios"],["✓","Filter by role, level, domain, score"],["✓","View portfolio scores and skill tags"],["✗","View full project solutions"],["✗","Contact candidates"],["✗","Export shortlists"],["✗","Saved search alerts"]]}
          cta={<Link to="/portfolios" className="block w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-sm font-medium hover:bg-muted">Start Browsing →</Link>}
        />
        <PlanColumn title="Monthly" price="₹2,999/month" badge="Most popular" highlight
          features={[["✓","Everything in Free"],["✓","Full portfolio access"],["✓","Contact up to 20 candidates/month"],["✓","Saved searches with email alerts"],["✓","CSV export of shortlists"]]}
          cta={<button onClick={() => openModal("monthly")} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">Request Access →</button>}
        />
        <PlanColumn title="Annual" price="₹24,999/year" badge="Best value · save 30%"
          features={[["✓","Everything in Monthly"],["✓","Unlimited candidate contacts"],["✓","Priority candidate matching"],["✓","Dedicated account manager"]]}
          cta={<button onClick={() => openModal("annual")} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">Request Access →</button>}
        />
      </div>

      <section className="mx-auto mt-20 max-w-3xl">
        <h2 className="font-display text-3xl font-semibold text-center">Frequently asked questions</h2>
        <div className="mt-8 space-y-3">
          {FAQS.map((f) => <FAQItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      <UpgradeModal open={open} onClose={() => setOpen(false)} defaultPlan={plan} />
    </AppShell>
  );
}

const FAQS = [
  { q: "How does RoleCraft verify candidates?", a: "Every submission is AI-evaluated against a structured rubric. Top submissions are reviewed by industry mentors who award a verified badge." },
  { q: "Can I post a job opening on the platform?", a: "Coming soon. Subscribed recruiters will be able to post real project challenges directly to our student base." },
  { q: "Is there a placement fee if I hire someone?", a: "No. Never. You pay only for platform access, not per hire." },
  { q: "How do I cancel?", a: "Email hello@rolecraft.in and we cancel within 24 hours. No questions asked." },
];

function PlanColumn({ title, price, badge, highlight, features, cta }: { title: string; price: string; badge?: string; highlight?: boolean; features: [string, string][]; cta: React.ReactNode }) {
  return (
    <div className={`rounded-3xl border-2 bg-card p-6 ${highlight ? "border-primary shadow-lg" : "border-border"}`}>
      {badge && <span className="inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{badge}</span>}
      <h3 className="mt-2 font-display text-2xl font-semibold">{title}</h3>
      <p className="mt-1 font-display text-3xl">{price}</p>
      <ul className="mt-5 space-y-2 text-sm">
        {features.map(([mark, text]) => (
          <li key={text} className="flex gap-2">
            <span className={mark === "✓" ? "text-success" : "text-muted-foreground"}>{mark}</span>
            <span className={mark === "✗" ? "text-muted-foreground" : ""}>{text}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">{cta}</div>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-border bg-card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left">
        <span className="font-medium">{q}</span>
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && <p className="px-6 pb-4 text-sm text-muted-foreground">{a}</p>}
    </div>
  );
}
