import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

export const Leaderboard = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/portfolios/leaderboard?page=1&limit=20").then((payload) => setRows(payload.leaderboard || [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-indigo-600">Leaderboard</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Top performers</h1>
        </div>
      </Card>
      <Card>
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Projects</th>
                <th className="px-6 py-4">Score</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse bg-slate-50"><td className="p-6" colSpan="5">&nbsp;</td></tr>
                ))
              ) : rows.length ? (
                rows.map((row, index) => (
                  <tr key={row._id} className={index < 3 ? "bg-indigo-50" : "bg-white"}>
                    <td className="border-t px-6 py-4 font-semibold">{index + 1}</td>
                    <td className="border-t px-6 py-4"><Link to={`/u/${row.user?._id}`} className="text-indigo-600">{row.user?.fullName || "Unknown"}</Link></td>
                    <td className="border-t px-6 py-4">{row.user?.role || "Student"}</td>
                    <td className="border-t px-6 py-4">{row.total_projects}</td>
                    <td className="border-t px-6 py-4">{row.average_score}</td>
                  </tr>
                ))
              ) : (
                <tr><td className="p-6 text-slate-500" colSpan="5">No leaderboard data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
