import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastProvider";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";

export const RecruiterRegister = () => {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [hiringForRole, setHiringForRole] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { isRecruiter, refreshUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  if (isRecruiter) {
    navigate("/recruiters");
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post("/recruiters/register", { name, company, company_size: companySize, hiring_for_role: hiringForRole, email });
      await refreshUser();
      toast.pushToast("Recruiter profile created", "success");
      navigate("/portfolios");
    } catch (error) {
      toast.pushToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-indigo-600">Recruiter registration</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Join as a recruiter</h1>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" required />
          <Input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Company" required />
          <Input value={companySize} onChange={(event) => setCompanySize(event.target.value)} placeholder="Company size" />
          <Input value={hiringForRole} onChange={(event) => setHiringForRole(event.target.value)} placeholder="Hiring for role" />
          <Input value={email} type="email" onChange={(event) => setEmail(event.target.value)} placeholder="Email" required />
          <Button type="submit" disabled={loading}>{loading ? "Registering..." : "Register as recruiter"}</Button>
        </form>
      </div>
    </Card>
  );
};
