import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../components/ToastProvider";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Collapsible } from "../components/ui/collapsible";
import { useNavigate } from "react-router-dom";

const focusAreas = ["user experience", "data pipeline", "security", "analytics", "automation", "scalability"];
const levels = ["beginner", "intermediate", "advanced"];
const domains = ["fintech", "edtech", "healthtech", "consumer", "b2b-saas", "logistics"];

export const GenerateProject = () => {
  const [roles, setRoles] = useState([]);
  const [roleSlug, setRoleSlug] = useState("");
  const [level, setLevel] = useState("beginner");
  const [domain, setDomain] = useState(domains[0]);
  const [focus, setFocus] = useState(focusAreas[0]);
  const [surprise, setSurprise] = useState(false);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/roles").then(setRoles).catch(() => setRoles([]));
  }, []);

  const previewRole = useMemo(() => roles.find((item) => item.slug === roleSlug), [roles, roleSlug]);

  const randomize = () => {
    setDomain(domains[Math.floor(Math.random() * domains.length)]);
    setFocus(focusAreas[Math.floor(Math.random() * focusAreas.length)]);
  };

  useEffect(() => {
    if (surprise) {
      randomize();
    }
  }, [surprise]);

  const handleGenerate = async () => {
    setError("");
    setLoading(true);
    try {
      const body = { roleSlug, level, domain, focus_area: focus };
      const payload = await api.post("/projects", body);
      setProject(payload);
      toast.pushToast("Project generated", "success");
    } catch (err) {
      if (err.status === 422 && !surprise) {
        try {
          const body = { roleSlug, level, domain, focus_area: focus };
          const payload = await api.post("/projects", body);
          setProject(payload);
          toast.pushToast("Project generated", "success");
          setError("");
        } catch (retryError) {
          setError(retryError.message);
          toast.pushToast(retryError.message, "error");
        }
      } else {
        setError(err.message);
        toast.pushToast(err.message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const startChallenge = async () => {
    if (!project?._id) return;
    try {
      const submission = await api.post("/submissions", { project_id: project._id });
      navigate(`/submit/${submission._id}`);
    } catch (err) {
      toast.pushToast(err.message, "error");
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-slate-200/40 bg-white/90 p-8 shadow-xl shadow-slate-950/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-600">Generate</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Create a challenge for your next project.</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={surprise} onChange={(event) => setSurprise(event.target.checked)} className="h-4 w-4 rounded border-slate-400 text-indigo-600" />
              Surprise me
            </label>
            <Button onClick={handleGenerate} disabled={loading || !roleSlug}>
              {loading ? "Generating..." : "Generate project"}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Challenge settings</p>
              <p className="mt-2 text-sm text-slate-600">The generated problem will match the role, difficulty, and industry focus.</p>
            </div>
            <div className="grid gap-4">
              <label className="space-y-2 text-sm text-slate-700">
                Role
                <select value={roleSlug} onChange={(event) => setRoleSlug(event.target.value)} className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-400">
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role._id} value={role.slug}>{role.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                Level
                <select value={level} onChange={(event) => setLevel(event.target.value)} className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-400">
                  {levels.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                Domain
                <select value={domain} onChange={(event) => setDomain(event.target.value)} className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-400">
                  {domains.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                Focus area
                <select value={focus} onChange={(event) => setFocus(event.target.value)} className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-400">
                  {focusAreas.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-5">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Preview</p>
            <div>
              <p className="text-lg font-semibold text-slate-950">{previewRole?.name || "Role"} • {level}</p>
              <p className="mt-2 text-sm text-slate-600">{previewRole?.description || "Choose a role to see the project preview."}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Badge variant="subtle">{domain}</Badge>
              <Badge variant="subtle">{focus}</Badge>
            </div>
            <p className="text-sm text-slate-500">{surprise ? "Random domain and focus will be used." : "Use the details above to fine-tune the generated challenge."}</p>
          </div>
        </Card>
      </div>

      {project && (
        <Card className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-amber-500">{project.role_id?.icon_emoji} {project.role_id?.name}</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{project.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{project.context}</p>
            </div>
            <div className="grid gap-2 sm:text-right">
              <Badge variant="info">{project.evaluation_rubric ? "Ready to start" : "Generated"}</Badge>
              <Badge variant="warning">{project.estimated_hours || "—"} hrs</Badge>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Problem</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{project.problem_statement}</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Deliverables</p>
              <ol className="mt-3 space-y-2 text-sm text-slate-700">
                {project.deliverables.split("\n").map((item, index) => (
                  <li key={index} className="flex gap-2"><span className="font-semibold text-indigo-600">{index + 1}.</span>{item.replace(/^[-\s]*/, "")}</li>
                ))}
              </ol>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-950/90 p-5 text-white">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Rubric</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">{project.evaluation_rubric}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/90 p-5 text-white">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Hints</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-200">
                  {project.hints?.map((hint, index) => <li key={index}>• {hint}</li>)}
                </ul>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" onClick={startChallenge}>Start Challenge</Button>
              <Button variant="ghost" onClick={handleGenerate}>Generate Another</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
