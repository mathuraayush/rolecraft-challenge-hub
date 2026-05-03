import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/submit")({
  component: () => (
    <AppShell>
      <h1 className="font-display text-4xl font-semibold">Submit a project</h1>
      <p className="mt-3 text-muted-foreground">Open a project from your dashboard to submit it for AI grading.</p>
      <Link to="/dashboard" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
        Go to dashboard →
      </Link>
    </AppShell>
  ),
});
