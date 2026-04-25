import { Link, useNavigate } from "@tanstack/react-router";
import { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="border-b border-border bg-background">
      <div className="container-narrow flex items-center justify-between py-4">
        <Link to="/" className="font-display text-xl font-semibold">RoleCraft</Link>
        <nav className="flex items-center gap-1 text-sm">
          {user && (
            <>
              <Link to="/dashboard" className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground" activeProps={{ className: "rounded-lg px-3 py-2 text-foreground font-medium" }}>
                Dashboard
              </Link>
              <Link to="/portfolios" className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground">
                Portfolios
              </Link>
              <Link to="/u/$id" params={{ id: user.id }} className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground">
                My portfolio
              </Link>
              <button
                onClick={async () => { await signOut(); navigate({ to: "/" }); }}
                className="ml-2 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </>
          )}
          {!user && (
            <Link to="/auth" className="rounded-xl bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container-narrow px-5 py-10">{children}</main>
    </div>
  );
}
