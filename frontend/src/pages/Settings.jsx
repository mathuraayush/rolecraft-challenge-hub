import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastProvider";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Card } from "../components/ui/card";

export const Settings = () => {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const userProfile = await api.get("/users/profile");
        const portfolioData = await api.get("/portfolios/my");
        setProfile(userProfile);
        setPortfolio(portfolioData.portfolio);
      } catch (error) {
        toast.pushToast(error.message, "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const updateProfile = async () => {
    setSaving(true);
    try {
      await api.put("/users/profile", {
        fullName: profile.fullName,
        college: profile.college,
        city: profile.city,
        bio: profile.bio,
        github_url: profile.github_url,
        linkedin_url: profile.linkedin_url,
        level: profile.level,
      });
      await api.put("/portfolios/my", {
        headline: portfolio.headline,
        bio: portfolio.bio,
        is_available_for_hire: portfolio.is_available_for_hire,
        is_public: portfolio.is_public,
      });
      await refreshUser();
      toast.pushToast("Settings updated", "success");
    } catch (error) {
      toast.pushToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async () => {
    if (!avatar) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("avatar", avatar);
      const payload = await api.postForm("/upload/avatar", formData);
      await refreshUser();
      setAvatar(null);
      toast.pushToast("Avatar uploaded", "success");
    } catch (error) {
      toast.pushToast(error.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="space-y-4"><div className="h-48 animate-pulse rounded-[32px] bg-slate-200" /></div>;
  }

  return (
    <div className="space-y-8">
      <Card>
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-indigo-600">Settings</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Profile and portfolio</h1>
        </div>
      </Card>
      <Card className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <h2 className="text-xl font-semibold text-slate-950">Profile</h2>
          <div className="grid gap-4">
            <label className="space-y-2 text-sm text-slate-700">
              Full name
              <Input value={profile.fullName} onChange={(event) => setProfile((current) => ({ ...current, fullName: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              College
              <Input value={profile.college} onChange={(event) => setProfile((current) => ({ ...current, college: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              City
              <Input value={profile.city} onChange={(event) => setProfile((current) => ({ ...current, city: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              Bio
              <Textarea value={profile.bio} onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))} />
            </label>
          </div>
        </div>
        <div className="space-y-5">
          <h2 className="text-xl font-semibold text-slate-950">Portfolio</h2>
          <div className="grid gap-4">
            <label className="space-y-2 text-sm text-slate-700">
              Headline
              <Input value={portfolio.headline || ""} onChange={(event) => setPortfolio((current) => ({ ...current, headline: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              Bio
              <Textarea value={portfolio.bio || ""} onChange={(event) => setPortfolio((current) => ({ ...current, bio: event.target.value }))} />
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input type="checkbox" checked={portfolio.is_available_for_hire} onChange={(event) => setPortfolio((current) => ({ ...current, is_available_for_hire: event.target.checked }))} className="h-4 w-4 rounded border-slate-500 text-indigo-600" />
              Open to opportunities
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input type="checkbox" checked={portfolio.is_public} onChange={(event) => setPortfolio((current) => ({ ...current, is_public: event.target.checked }))} className="h-4 w-4 rounded border-slate-500 text-indigo-600" />
              Public portfolio
            </label>
          </div>
        </div>
      </Card>
      <Card className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <h2 className="text-xl font-semibold text-slate-950">Avatar</h2>
          <p className="text-sm text-slate-600">Upload your profile image to personalize your portfolio.</p>
          <input type="file" accept="image/*" onChange={(event) => setAvatar(event.target.files?.[0] || null)} className="text-sm text-slate-700" />
        </div>
        <div className="flex items-end justify-end">
          <Button onClick={uploadAvatar} disabled={!avatar || saving}>{saving ? "Uploading..." : "Upload avatar"}</Button>
        </div>
      </Card>
      <div className="flex justify-end">
        <Button onClick={updateProfile} disabled={saving}>{saving ? "Saving..." : "Save settings"}</Button>
      </div>
    </div>
  );
};
