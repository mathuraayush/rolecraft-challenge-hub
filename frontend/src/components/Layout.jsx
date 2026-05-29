import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export const Layout = ({ children }) => {
  const { user, isRecruiter, logout } = useAuth();
  return (
    <div className="min-h-screen bg-[#FAFAF9] text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 rounded-[32px] border border-slate-200/20 bg-[#F8F6F3]/80 p-5 shadow-xl shadow-slate-950/10 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="inline-flex items-center gap-3 text-lg font-semibold text-slate-950">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-3xl bg-indigo-600 text-lg">RC</span>
              RoleCraft
            </Link>
            {isRecruiter && <Badge variant="info">Recruiter</Badge>}
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
            {!user && (
              <>
                <NavLink to="/pricing" className="transition hover:text-indigo-700">Pricing</NavLink>
                <NavLink to="/recruiter/register" className="transition hover:text-indigo-700">I'm a Recruiter</NavLink>
                <Link to="/login"><Button variant="primary" className="text-sm">Sign In</Button></Link>
              </>
            )}
            {user && !isRecruiter && (
              <>
                <NavLink to="/dashboard" className="transition hover:text-indigo-700">My Projects</NavLink>
                <NavLink to={`/u/${user._id}`} className="transition hover:text-indigo-700">My Portfolio</NavLink>
                <NavLink to="/leaderboard" className="transition hover:text-indigo-700">Leaderboard</NavLink>
                <NavLink to="/settings" className="transition hover:text-indigo-700">Settings</NavLink>
                <button onClick={logout} className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Sign Out
                </button>
              </>
            )}
            {user && isRecruiter && (
              <>
                <NavLink to="/portfolios" className="transition hover:text-indigo-700">Browse</NavLink>
                <NavLink to="/recruiters" className="transition hover:text-indigo-700">Dashboard</NavLink>
                <NavLink to="/pricing" className="transition hover:text-indigo-700">Pricing</NavLink>
                <NavLink to="/portfolios" className="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300">
                  Upgrade ⭐
                </NavLink>
                <button onClick={logout} className="rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Sign Out
                </button>
              </>
            )}
          </nav>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
};
