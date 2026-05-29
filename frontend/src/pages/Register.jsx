import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useToast } from "../components/ToastProvider";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export const Register = () => {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post("/users/register", { fullName, username, email, password });
      toast.pushToast("Account created. Please sign in.", "success");
      navigate("/login");
    } catch (error) {
      toast.pushToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-[32px] border border-slate-200/40 bg-white/90 p-8 shadow-xl shadow-slate-950/5">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-indigo-600">Register</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Create your RoleCraft account</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block text-sm text-slate-700">
          Full name
          <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your full name" required />
        </label>
        <label className="block text-sm text-slate-700">
          Username
          <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="username" required />
        </label>
        <label className="block text-sm text-slate-700">
          Email
          <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@example.com" required />
        </label>
        <label className="block text-sm text-slate-700">
          Password
          <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="••••••••" required />
        </label>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </div>
  );
};
