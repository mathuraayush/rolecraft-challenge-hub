import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const PublicPortfolio = () => {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, isRecruiter, recruiter } = useAuth();

  useEffect(() => {
    api.get(`/portfolios/user/${userId}`).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [userId]);

  const isOwner = user?._id === userId;
  const isSubscribedRecruiter = isRecruiter && recruiter?.is_subscribed;
  const fullAccess = isOwner || isSubscribedRecruiter;

  const domainTags = useMemo(() => {
    return data?.submissions?.map((item) => item.project_id?.domain).filter(Boolean).slice(0, 5) || [];
  }, [data]);

  if (loading) {
    return <div className="space-y-4"><div className="h-56 animate-pulse rounded-[32px] bg-slate-200" /></div>;
  }

  if (!data) {
    return <p className="rounded-[32px] border border-slate-200/40 bg-white/90 p-8 text-slate-700">Portfolio not found.</p>;
  }

  const { portfolio, submissions, stats } = data;
  const viewerHint = !fullAccess ? (user ? "Become a recruiter to view full portfolios." : "Sign up to view full portfolios.") : null;

  return (
    <div className="space-y-8">
      <Card>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-600">Portfolio</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">{portfolio.user_id?.fullName}</h1>
            <p className="mt-2 text-sm text-slate-600">{portfolio.user_id?.role} • {portfolio.user_id?.level}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Badge variant="info">{portfolio.user_id?.college}</Badge>
            <Badge variant="accent">{portfolio.user_id?.city}</Badge>
            <Badge variant="success">Score {stats?.average_score || 0}</Badge>
          </div>
        </div>
      </Card>
      <Card className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{portfolio.bio || "No headline yet."}</p>
          <div className="flex flex-wrap gap-2">
            {domainTags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
          </div>
          {fullAccess && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-950">Submissions</h2>
              <div className="space-y-4">
                {submissions.map((item) => (
                  <div key={item._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-500">{item.project_id?.domain} • {item.project_id?.difficulty_level}</p>
                        <h3 className="mt-2 text-lg font-semibold text-slate-950">{item.project_id?.title}</h3>
                      </div>
                      <Badge variant="info">Score {item.ai_score || 0}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.approach_text?.slice(0, 140) || "No approach text available."}</p>
                    <div className="mt-4 text-sm text-slate-500">{item.submission_link}</div>
                    {item.ai_feedback && <ReactMarkdown className="mt-3 text-sm text-slate-600">{item.ai_feedback}</ReactMarkdown>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {!fullAccess && (
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 p-8 text-slate-100">
            <div className="absolute inset-0 bg-slate-950/90" />
            <div className="relative space-y-4">
              <p className="text-sm uppercase tracking-[0.25em] text-amber-300">Locked portfolio</p>
              <h2 className="text-2xl font-semibold">Full portfolio access is restricted</h2>
              <p className="text-sm leading-7 text-slate-300">{viewerHint}</p>
              {user ? (
                <Link to="/recruiter/register"><Button variant="accent">Become a recruiter</Button></Link>
              ) : (
                <Link to="/register"><Button variant="accent">Sign up as recruiter</Button></Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
