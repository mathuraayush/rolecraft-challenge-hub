import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/generate")({
  component: () => (
    <AppShell>
      <h1 className="font-display text-4xl font-semibold">Explore challenges</h1>
      <p className="mt-3 text-muted-foreground">Generate a fresh AI project tailored to your role from your dashboard.</p>
      <Link to="/dashboard" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
        Go to dashboard →
      </Link>
    </AppShell>
  ),
});
