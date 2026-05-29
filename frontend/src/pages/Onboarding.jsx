import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastProvider";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";

const levels = [
  { key: "beginner", label: "Beginner", description: "Build confidence with practical fundamentals." },
  { key: "intermediate", label: "Intermediate", description: "Tackle cross-functional challenges." },
  { key: "advanced", label: "Advanced", description: "Design scalable systems with polish." },
];

export const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [college, setCollege] = useState("");
  const [city, setCity] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [level, setLevel] = useState("beginner");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { user, refreshUser, setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    if (user.onboarded) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  useEffect(() => {
    api.get("/roles").then(setRoles).catch(() => setRoles([]));
  }, []);

  const isStepOneValid = college && city && githubUrl && linkedinUrl;
  const isStepTwoValid = !!selectedRole;

  const selectedRoleLabel = useMemo(() => selectedRole?.name ?? "Select a role", [selectedRole]);

  const finishOnboarding = async () => {
    if (!isStepOneValid || !isStepTwoValid) return;
    setLoading(true);
    try {
      await api.put("/users/profile", {
        college,
        city,
        github_url: githubUrl,
        linkedin_url: linkedinUrl,
        level,
      });
      setUser((current) => ({ ...current, college, city, github_url: githubUrl, linkedin_url: linkedinUrl, level, onboarded: true, role: selectedRole?.name ?? current?.role }));
      await refreshUser();
      toast.pushToast("Onboarding complete", "success");
      navigate("/dashboard");
    } catch (error) {
      toast.pushToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[32px] border border-slate-200/40 bg-white/90 p-8 shadow-xl shadow-slate-950/5">
        <p className="text-sm uppercase tracking-[0.25em] text-indigo-600">Onboarding</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950">Finish your profile to unlock projects.</h1>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          {[1, 2, 3].map((value) => (
            <div key={value} className={`flex-1 rounded-full border px-4 py-2 ${step === value ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-slate-200 bg-slate-100 text-slate-500"}`}>
              Step {value}
            </div>
          ))}
        </div>
        {step === 1 && (
          <Card>
            <div className="space-y-5">
              <div className="text-slate-900">
                <h2 className="text-2xl font-semibold">Tell us about you</h2>
                <p className="mt-2 text-sm text-slate-600">Complete your profile so RoleCraft can match the right challenges.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  College
                  <Input value={college} onChange={(event) => setCollege(event.target.value)} placeholder="Your college" required />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  City
                  <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Your city" required />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  GitHub URL
                  <Input value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} placeholder="https://github.com/you" required />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  LinkedIn URL
                  <Input value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} placeholder="https://linkedin.com/in/you" required />
                </label>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" disabled={!isStepOneValid} onClick={() => setStep(2)}>
                  Continue
                </Button>
              </div>
            </div>
          </Card>
        )}
        {step === 2 && (
          <Card>
            <div className="space-y-5">
              <div className="text-slate-900">
                <h2 className="text-2xl font-semibold">Choose your role</h2>
                <p className="mt-2 text-sm text-slate-600">Pick the role that best matches the work you want to showcase.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {roles.map((role) => (
                  <button
                    key={role._id}
                    type="button"
                    className={`rounded-3xl border p-5 text-left transition ${selectedRole?._id === role._id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-indigo-300"}`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="text-2xl">{role.icon_emoji}</div>
                    <p className="mt-4 font-semibold text-slate-950">{role.name}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{role.description}</p>
                  </button>
                ))}
              </div>
              <div className="flex justify-between gap-3">
                <Button variant="ghost" type="button" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" disabled={!isStepTwoValid} onClick={() => setStep(3)}>
                  Continue
                </Button>
              </div>
            </div>
          </Card>
        )}
        {step === 3 && (
          <Card>
            <div className="space-y-5">
              <div className="text-slate-900">
                <h2 className="text-2xl font-semibold">Select your level</h2>
                <p className="mt-2 text-sm text-slate-600">Tell us how confident you are so we can tailor the right challenge.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {levels.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`rounded-3xl border p-5 text-left transition ${level === item.key ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-slate-50 hover:border-indigo-300"}`}
                    onClick={() => setLevel(item.key)}
                  >
                    <p className="text-lg font-semibold text-slate-950">{item.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                  </button>
                ))}
              </div>
              <div className="flex justify-between gap-3">
                <Button variant="ghost" type="button" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="button" disabled={loading} onClick={finishOnboarding}>
                  {loading ? "Saving..." : "Finish onboarding"}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
