import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

interface Person {
  id: string;
  name: string | null;
  city: string | null;
  college: string | null;
  role: string | null;
  level: string | null;
  bio: string | null;
  portfolios: { headline: string | null; is_available_for_hire: boolean; is_public: boolean } | null;
}

interface Role { slug: string; name: string; icon_emoji: string }

export const Route = createFileRoute("/portfolios")({
  validateSearch: z.object({
    role: z.string().optional(),
    level: z.string().optional(),
    hire: z.string().optional(),
  }),
  component: PortfoliosPage,
});

function PortfoliosPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [people, setPeople] = useState<Person[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("roles").select("slug, name, icon_emoji").then(({ data }) => {
      if (data) setRoles(data);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    let q = supabase
      .from("users")
      .select("id, name, city, college, role, level, bio, portfolios(headline, is_available_for_hire, is_public)")
      .eq("onboarded", true);
    if (search.role) q = q.eq("role", search.role);
    if (search.level) q = q.eq("level", search.level);
    q.order("created_at", { ascending: false }).limit(100).then(({ data }) => {
      let rows = (data as unknown as Person[]) || [];
      rows = rows.filter((r) => r.portfolios?.is_public !== false);
      if (search.hire === "1") rows = rows.filter((r) => r.portfolios?.is_available_for_hire);
      setPeople(rows);
      setLoading(false);
    });
  }, [search.role, search.level, search.hire]);

  const setParam = (key: string, value: string | undefined) => {
    navigate({ search: (prev: Record<string, string | undefined>) => ({ ...prev, [key]: value || undefined }) });
  };

  return (
    <AppShell>
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-4xl font-semibold">Portfolios</h1>
          <p className="mt-2 text-muted-foreground">Discover students building real projects across roles.</p>
        </div>
        <Link to="/recruiters" className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-muted">
          I'm a recruiter →
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <FilterChip active={!search.role} onClick={() => setParam("role", undefined)}>All roles</FilterChip>
        {roles.map((r) => (
          <FilterChip key={r.slug} active={search.role === r.slug} onClick={() => setParam("role", r.slug)}>
            {r.icon_emoji} {r.name}
          </FilterChip>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <FilterChip active={!search.level} onClick={() => setParam("level", undefined)}>Any level</FilterChip>
        {["beginner", "intermediate", "advanced"].map((l) => (
          <FilterChip key={l} active={search.level === l} onClick={() => setParam("level", l)}>{l}</FilterChip>
        ))}
        <FilterChip active={search.hire === "1"} onClick={() => setParam("hire", search.hire === "1" ? undefined : "1")}>
          ✓ Available for hire
        </FilterChip>
      </div>

      {loading ? (
        <p className="mt-10 text-muted-foreground">Loading…</p>
      ) : people.length === 0 ? (
        <p className="mt-10 text-muted-foreground">No portfolios match these filters yet.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((p) => {
            const role = roles.find((r) => r.slug === p.role);
            return (
              <Link
                key={p.id}
                to="/u/$id"
                params={{ id: p.id }}
                className="group rounded-2xl border border-border bg-card p-6 transition hover:border-foreground/20 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-semibold text-primary">
                    {p.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <div className="font-display text-lg font-semibold group-hover:text-primary">{p.name || "Anonymous"}</div>
                    <div className="text-xs text-muted-foreground">{p.city}{p.college ? ` · ${p.college}` : ""}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {role && <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">{role.icon_emoji} {role.name}</span>}
                  {p.level && <span className="rounded-full bg-accent/20 px-2.5 py-1 font-medium capitalize text-accent-foreground">{p.level}</span>}
                  {p.portfolios?.is_available_for_hire && (
                    <span className="rounded-full bg-success/15 px-2.5 py-1 font-medium text-success">Available</span>
                  )}
                </div>
                {p.portfolios?.headline && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.portfolios.headline}</p>}
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition capitalize ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
