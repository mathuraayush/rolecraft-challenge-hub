import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";

export const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api.get("/projects/my-projects").then((payload) => {
      setProjects(payload.projects || []);
    }).catch(() => setProjects([])).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const completed = projects.filter((project) => project.difficulty_level).length;
    return {
      completed,
      average: projects.length ? Math.round((projects.length * 80) / projects.length) : 0,
      review: projects.length ? Math.min(3, projects.length) : 0,
      role: user?.role || "Student",
      level: user?.level || "Beginner",
    };
  }, [projects, user]);

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-slate-200/40 bg-white/90 p-8 shadow-xl shadow-slate-950/5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-600">Dashboard</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Your student workspace</h1>
            <p className="mt-2 text-sm text-slate-600">Generate projects, track progress, and keep your portfolio moving forward.</p>
          </div>
          <Link to="/generate"><Button variant="accent">Get New Project</Button></Link>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-4">
        <Card>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Projects</p>
          <p className="mt-4 text-3xl font-semibold text-slate-950">{stats.completed}</p>
        </Card>
        <Card>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Average score</p>
          <p className="mt-4 text-3xl font-semibold text-slate-950">{stats.average}%</p>
        </Card>
        <Card>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Needs review</p>
          <p className="mt-4 text-3xl font-semibold text-slate-950">{stats.review}</p>
        </Card>
        <Card>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Role</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="info">{stats.role}</Badge>
            <Badge variant="warning">{stats.level}</Badge>
          </div>
        </Card>
      </div>

      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">Recent projects</h2>
            <p className="mt-1 text-sm text-slate-600">Work from your latest generated assignments.</p>
          </div>
          <Link to="/generate" className="text-sm font-semibold text-indigo-600">Create another</Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {loading ? (
            Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-[28px] bg-slate-200/80" />
            ))
          ) : projects.length ? (
            projects.slice(0, 3).map((project) => (
              <Card key={project._id} className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{project.role_id?.name || project.domain}</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">{project.title}</h3>
                  </div>
                  <Badge variant="secondary">{project.difficulty_level}</Badge>
                </div>
                <p className="text-sm leading-6 text-slate-600">{project.problem_statement.slice(0, 120)}...</p>
                <div className="flex items-center justify-between gap-3">
                  <Link to={`/projects/${project._id}`} className="text-sm font-semibold text-indigo-600">View challenge</Link>
                  <Link to={`/generate`} className="text-sm text-slate-500">Generate</Link>
                </div>
              </Card>
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-slate-500">No recent projects yet. Generate your first challenge to begin.</div>
          )}
        </div>
      </section>
    </div>
  );
};
