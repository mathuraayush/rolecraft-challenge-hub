import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastProvider";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await auth.login(email, password);
      toast.pushToast("Signed in successfully", "success");
      if (!auth.user?.onboarded) {
        navigate("/onboarding");
      } else if (auth.isRecruiter) {
        navigate("/portfolios");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      toast.pushToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-[32px] border border-slate-200/40 bg-white/90 p-8 shadow-xl shadow-slate-950/5">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-indigo-600">Sign in</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Welcome back</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block text-sm text-slate-700">
          Email
          <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@example.com" required />
        </label>
        <label className="block text-sm text-slate-700">
          Password
          <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="••••••••" required />
        </label>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <p className="text-center text-sm text-slate-600">
        New to RoleCraft? <span className="cursor-pointer text-indigo-600" onClick={() => navigate("/register")}>Create an account</span>
      </p>
    </div>
  );
};
