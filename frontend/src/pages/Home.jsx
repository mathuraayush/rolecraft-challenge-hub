import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

export const Home = () => (
  <div className="space-y-10 pb-12">
    <section className="rounded-[32px] border border-slate-200/40 bg-white/90 p-10 shadow-xl shadow-slate-950/5">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="space-y-6">
          <p className="inline-flex rounded-full bg-indigo-100 px-4 py-1 text-sm font-semibold text-indigo-700">Modern project challenges for future-ready talent</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Level up your portfolio with AI-designed industry projects.</h1>
          <p className="max-w-2xl text-base leading-8 text-slate-600">RoleCraft helps students build authentic work, recruiters discover vetted portfolios, and teams connect through better challenge-based hiring.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/register"><Button variant="primary">Get started</Button></Link>
            <Link to="/pricing"><Button variant="ghost">See pricing</Button></Link>
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-200/70 bg-slate-950 p-8 text-slate-50 shadow-2xl shadow-slate-950/20">
          <p className="text-sm uppercase tracking-[0.25em] text-amber-300">Live student workflow</p>
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl bg-slate-900/80 p-5">
              <p className="text-sm text-slate-400">Welcome back, Maya.</p>
              <p className="mt-2 text-xl font-semibold">Continue your latest submission</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-900/80 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Project</p>
                <p className="mt-3 font-semibold text-white">AI-powered fintech dashboard</p>
              </div>
              <div className="rounded-3xl bg-slate-900/80 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Portfolio score</p>
                <p className="mt-3 text-3xl font-semibold text-emerald-300">91</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="grid gap-6 md:grid-cols-3">
      {[
        { title: "Generate challenges", description: "Create role-specific problems tailored to your skill level." },
        { title: "Submit work", description: "Save drafts, submit, and receive AI review feedback." },
        { title: "Show recruiters", description: "Turn graded submissions into portfolio proof points." },
      ].map((card) => (
        <div key={card.title} className="rounded-[28px] border border-slate-200/40 bg-white p-6 text-slate-950 shadow-sm">
          <p className="text-lg font-semibold">{card.title}</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">{card.description}</p>
        </div>
      ))}
    </section>

    <section className="rounded-[32px] border border-slate-200/40 bg-white/90 p-10 shadow-xl shadow-slate-950/5">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-indigo-600">Trusted by future teams</p>
          <h2 className="mt-4 text-3xl font-semibold text-slate-950">A portfolio platform built for recruiters and rising talent.</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Badge>Indigo</Badge>
          <Badge>Amber</Badge>
          <Badge>Minimal</Badge>
          <Badge>Design-first</Badge>
        </div>
      </div>
    </section>
  </div>
);
