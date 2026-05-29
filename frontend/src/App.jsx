import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Onboarding } from "./pages/Onboarding";
import { Dashboard } from "./pages/Dashboard";
import { GenerateProject } from "./pages/GenerateProject";
import { ProjectDetail } from "./pages/ProjectDetail";
import { SubmissionForm } from "./pages/SubmissionForm";
import { Leaderboard } from "./pages/Leaderboard";
import { PublicPortfolio } from "./pages/PublicPortfolio";
import { Settings } from "./pages/Settings";
import { PortfoliosBrowse } from "./pages/PortfoliosBrowse";
import { RecruiterDashboard } from "./pages/RecruiterDashboard";
import { RecruiterRegister } from "./pages/RecruiterRegister";
import { Pricing } from "./pages/Pricing";
import { NotFound } from "./pages/NotFound";

const LoadingFallback = () => (
  <div className="rounded-[32px] border border-slate-200/40 bg-white/90 p-8 text-slate-700 shadow-xl shadow-slate-950/5">Loading...</div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  return user ? children : <Navigate to="/login" replace />;
};

const StudentRoute = ({ children }) => {
  const { user, isRecruiter, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" replace />;
  if (isRecruiter) return <Navigate to="/portfolios" replace />;
  if (!user.onboarded) return <Navigate to="/onboarding" replace />;
  return children;
};

const RecruiterRoute = ({ children }) => {
  const { user, isRecruiter, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  if (!user) return <Navigate to="/login" replace />;
  return isRecruiter ? children : <Navigate to="/portfolios" replace />;
};

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/dashboard" element={<StudentRoute><Dashboard /></StudentRoute>} />
        <Route path="/generate" element={<StudentRoute><GenerateProject /></StudentRoute>} />
        <Route path="/projects/:projectId" element={<StudentRoute><ProjectDetail /></StudentRoute>} />
        <Route path="/submit/:submissionId" element={<StudentRoute><SubmissionForm /></StudentRoute>} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/u/:userId" element={<PublicPortfolio />} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/portfolios" element={<RecruiterRoute><PortfoliosBrowse /></RecruiterRoute>} />
        <Route path="/recruiters" element={<RecruiterRoute><RecruiterDashboard /></RecruiterRoute>} />
        <Route path="/recruiter/register" element={<ProtectedRoute><RecruiterRegister /></ProtectedRoute>} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

export default App;