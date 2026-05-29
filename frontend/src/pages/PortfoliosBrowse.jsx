import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastProvider";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { UpgradeModal } from "../components/UpgradeModal";

export const PortfoliosBrowse = () => {
  const [roles, setRoles] = useState([]);
  const [filters, setFilters] = useState({ role: "", level: "", domain: "", search: "" });
  const [portfolios, setPortfolios] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { isRecruiter, recruiter } = useAuth();
  const toast = useToast();

  useEffect(() => {
    api.get("/roles").then(setRoles).catch(() => setRoles([]));
    api.get("/portfolios/search?limit=20").then((payload) => setPortfolios(payload.portfolios || [])).catch(() => setPortfolios([])).finally(() => setLoading(false));
    if (isRecruiter) {
      api.get("/recruiters/contacts").then((payload) => setContacts(payload.contacts || [])).catch(() => setContacts([]));
    }
  }, [isRecruiter]);

  const contactSet = useMemo(() => new Set(contacts.map((item) => item.student_user_id?._id)), [contacts]);

  const search = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(filters).toString();
      const payload = await api.get(`/portfolios/search?${query}&limit=20`);
      setPortfolios(payload.portfolios || []);
    } catch (error) {
      toast.pushToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const sendInterest = async (userId) => {
    if (!recruiter?.is_subscribed) {
      setOpen(true);
      return;
    }
    try {
      await api.post("/recruiters/contacts", { student_user_id: userId });
      toast.pushToast("Interest sent", "success");
      setContacts((current) => [...current, { student_user_id: { _id: userId } }]);
    } catch (error) {
      toast.pushToast(error.message, "error");
    }
  };

  return (
    <div className="space-y-8">
      <UpgradeModal open={open} onClose={() => setOpen(false)} />
      <Card>
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-indigo-600">Browse</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Candidate portfolios</h1>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Filters</h2>
            <p className="mt-2 text-sm text-slate-600">Refine candidate search by role, level, and domain.</p>
          </div>
          <label className="space-y-2 text-sm text-slate-700">
            Role
            <select className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100" value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}>
              <option value="">All</option>
              {roles.map((role) => <option key={role._id} value={role.slug}>{role.name}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            Level
            <select className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100" value={filters.level} onChange={(event) => setFilters((current) => ({ ...current, level: event.target.value }))}>
              <option value="">All</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label className="space-y-2 text-sm text-slate-700">
            Domain
            <input className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100" placeholder="e.g. fintech" value={filters.domain} onChange={(event) => setFilters((current) => ({ ...current, domain: event.target.value }))} />
          </label>
          <Button onClick={search} disabled={loading}>Apply filters</Button>
          {!recruiter?.is_subscribed && (
            <div className="rounded-3xl bg-amber-50 p-4 text-sm text-slate-800">
              Upgrade to contact candidates.
            </div>
          )}
        </Card>
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-[28px] bg-slate-200" />)
          ) : portfolios.length ? (
            <div className="grid gap-4">
              {portfolios.map((portfolio) => (
                <Card key={portfolio._id} className="grid gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{portfolio.user_id?.fullName}</p>
                      <p className="text-sm text-slate-600">{portfolio.user_id?.role} • {portfolio.user_id?.level}</p>
                      <p className="text-sm text-slate-500">{portfolio.user_id?.college} · {portfolio.user_id?.city}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="info">Score</Badge>
                      <Badge variant="accent">{portfolio.user_id?.role}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="secondary" onClick={() => window.location.href = `/u/${portfolio.user_id?._id}`} >View Portfolio</Button>
                    <Button onClick={() => sendInterest(portfolio.user_id?._id)}>{contactSet.has(portfolio.user_id?._id) ? "Interest Sent ✓" : recruiter?.is_subscribed ? "Interested" : "Upgrade"}</Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="rounded-[28px] border-dashed border-slate-300 bg-slate-50 p-8 text-slate-500">No portfolios match your filters yet.</Card>
          )}
        </div>
      </div>
    </div>
  );
};
