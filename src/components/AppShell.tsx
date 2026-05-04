import { Link, useNavigate } from "@tanstack/react-router";
import { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useRecruiter } from "@/lib/useRecruiter";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const { isRecruiter, recruiter } = useRecruiter();
  const navigate = useNavigate();

  const handleSignOut = async () => { await signOut(); navigate({ to: "/" }); };

  return (
    <header className="border-b border-border bg-background">
      <div className="container-narrow flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Link to="/" className="font-display text-xl font-semibold">RoleCraft</Link>
          {user && isRecruiter && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">Recruiter</span>
          )}
        </div>
        <nav className="flex items-center gap-1 text-sm">
          {!user && (
            <>
              <Link to="/recruiters" className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground">For Recruiters</Link>
              <Link to="/auth" className="rounded-xl bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90">Sign in</Link>
            </>
          )}

          {user && isRecruiter && (
            <>
              <NavLink to="/portfolios">Browse Candidates</NavLink>
              <NavLink to="/recruiters">Saved Searches</NavLink>
              <NavLink to="/pricing">Pricing</NavLink>
              {!recruiter?.is_subscribed && (
                <Link to="/pricing" className="ml-1 rounded-lg bg-accent/20 px-3 py-2 text-xs font-medium text-accent-foreground hover:bg-accent/30">Upgrade ⭐</Link>
              )}
              <button onClick={handleSignOut} className="ml-2 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground">Sign out</button>
            </>
          )}

          {user && !isRecruiter && (
            <>
              <NavLink to="/dashboard">My Projects</NavLink>
              <Link to="/u/$id" params={{ id: user.id }} className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground">My Portfolio</Link>
              <NavLink to="/leaderboard">Leaderboard</NavLink>
              <NavLink to="/settings">Settings</NavLink>
              <button onClick={handleSignOut} className="ml-2 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground">Sign out</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to as any} className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground" activeProps={{ className: "rounded-lg px-3 py-2 text-foreground font-medium" }}>
      {children}
    </Link>
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
