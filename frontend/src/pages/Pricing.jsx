import { useState } from "react";
import { UpgradeModal } from "../components/UpgradeModal";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const Pricing = () => {
  const [open, setOpen] = useState(false);

  const plans = [
    { title: "Free", price: "₹0", description: "Browse portfolios only", features: ["Project generation", "Portfolio showcase", "Community leaderboard"] },
    { title: "Monthly", price: "₹2,999", description: "20 contacts / month", features: ["Recruiter contacts", "Saved searches", "CSV export"] },
    { title: "Annual", price: "₹24,999", description: "Unlimited access", features: ["All monthly features", "Unlimited contacts", "Priority support"] },
  ];

  return (
    <div className="space-y-8">
      <UpgradeModal open={open} onClose={() => setOpen(false)} />
      <Card>
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-indigo-600">Pricing</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Plans for every recruiter and student.</h1>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.title} className={`space-y-5 ${plan.title === "Free" ? "border-slate-300" : plan.title === "Annual" ? "border-amber-300" : "border-slate-300"}`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-950">{plan.title}</h2>
                {plan.title !== "Free" && <Badge variant="warning">Popular</Badge>}
              </div>
              <p className="text-4xl font-semibold text-slate-950">{plan.price}</p>
              <p className="text-sm text-slate-600">{plan.description}</p>
            </div>
            <ul className="space-y-2 text-sm text-slate-700">
              {plan.features.map((feature) => (<li key={feature}>• {feature}</li>))}
            </ul>
            <Button onClick={() => setOpen(true)}>{plan.title === "Free" ? "Get started" : "Upgrade"}</Button>
          </Card>
        ))}
      </div>
      <Card>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-950">Frequently asked questions</h2>
          {[
            { question: "What does the recruiter plan include?", answer: "Contact students, save searches, and export candidate details." },
            { question: "Can I browse portfolios for free?", answer: "Yes. Free access allows portfolio browsing without contact features." },
            { question: "Is there a trial?", answer: "You can create a recruiter account and browse free portfolios before upgrading." },
            { question: "How do I get support?", answer: "Request support through the upgrade form and we will reach out within 24 hours." },
          ].map((item) => (
            <div key={item.question} className="rounded-3xl border border-slate-200/80 bg-slate-50 p-5">
              <p className="font-semibold text-slate-950">{item.question}</p>
              <p className="mt-2 text-sm text-slate-600">{item.answer}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
