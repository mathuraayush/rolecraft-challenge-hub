import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const ProjectDetail = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/projects/${projectId}`).then(setProject).catch(() => setProject(null)).finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return <div className="space-y-4"><div className="h-48 animate-pulse rounded-[32px] bg-slate-200" /></div>;
  }

  if (!project) {
    return <p className="rounded-[32px] border border-slate-200/40 bg-white/90 p-8 text-slate-700">Project not found.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-600">Project detail</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">{project.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{project.domain}</Badge>
            <Badge>{project.difficulty_level}</Badge>
            {project.role_id?.name && <Badge variant="info">{project.role_id.name}</Badge>}
          </div>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Problem statement</p>
            <p className="text-sm leading-7 text-slate-700">{project.problem_statement}</p>
          </div>
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Context</p>
            <p className="text-sm leading-7 text-slate-700">{project.context || "No additional context."}</p>
          </div>
        </div>
      </Card>
      <Card>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Deliverables</p>
            <ol className="mt-4 space-y-3 text-sm text-slate-700">
              {project.deliverables.split("\n").map((item, index) => (
                <li key={index} className="flex gap-2"><span className="font-semibold text-indigo-600">{index + 1}.</span>{item.replace(/^[-\s]*/, "")}</li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Rubric</p>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{project.evaluation_rubric}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
