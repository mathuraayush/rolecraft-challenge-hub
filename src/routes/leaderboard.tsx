import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/leaderboard")({
  component: () => (
    <AppShell>
      <h1 className="font-display text-4xl font-semibold">Leaderboard</h1>
      <p className="mt-3 text-muted-foreground">Coming soon — see top scoring portfolios this month.</p>
    </AppShell>
  ),
});
