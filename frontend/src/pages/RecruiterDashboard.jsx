import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../components/ToastProvider";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const RecruiterDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const recruiterProfile = await api.get("/recruiters/profile");
        const contactPayload = await api.get("/recruiters/contacts");
        setProfile(recruiterProfile);
        setContacts(contactPayload.contacts || []);
      } catch (error) {
        toast.pushToast(error.message, "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const exportCsv = () => {
    const rows = ["Name,Email,Role,Company,Contact status"];
    contacts.forEach((item) => {
      const student = item.student_user_id || {};
      rows.push(`"${student.fullName || ""}","${student.email || ""}","${student.role || ""}","${profile?.company || ""}","${item.email_sent ? "Sent" : "Pending"}"`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "contacts.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="space-y-4"><div className="h-48 animate-pulse rounded-[32px] bg-slate-200" /></div>;
  }

  return (
    <div className="space-y-8">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-600">Recruiter dashboard</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">{profile?.name}</h1>
            <p className="mt-2 text-sm text-slate-600">{profile?.company} • {profile?.hiring_for_role}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge variant={profile?.is_subscribed ? "success" : "warning"}>{profile?.is_subscribed ? "Subscribed" : "Free"}</Badge>
            <Button onClick={exportCsv} disabled={!profile?.is_subscribed || contacts.length === 0}>Export CSV</Button>
          </div>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-950">Stats</h2>
          <div className="grid gap-4">
            <div className="rounded-3xl bg-slate-950/95 p-5 text-slate-100">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Contacts</p>
              <p className="mt-3 text-3xl font-semibold">{contacts.length}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/95 p-5 text-slate-100">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Subscription</p>
              <p className="mt-3 text-xl font-semibold">{profile?.subscription_plan || "Free"}</p>
            </div>
          </div>
        </Card>
        <Card className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-950">Saved searches</h2>
          {profile?.saved_searches?.length ? (
            <div className="space-y-3">
              {profile.saved_searches.map((search) => (
                <div key={search.id} className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4 text-slate-100">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{search.name}</p>
                    <button type="button" onClick={async () => {
                      try {
                        await api.delete(`/recruiters/searches/${search.id}`);
                        setProfile((current) => ({
                          ...current,
                          saved_searches: current.saved_searches.filter((item) => item.id !== search.id),
                        }));
                        toast.pushToast("Removed saved search", "success");
                      } catch (error) {
                        toast.pushToast(error.message, "error");
                      }
                    }} className="text-sm text-amber-300">Remove</button>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{Object.entries(search.filters).map(([key, value]) => `${key}: ${value}`).join(", ")}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No saved searches yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
};
