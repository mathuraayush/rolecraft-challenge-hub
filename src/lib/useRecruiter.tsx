import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface RecruiterRow {
  id: string;
  name: string;
  company: string;
  email: string;
  hiring_for_role: string | null;
  is_subscribed: boolean;
  subscription_plan: string | null;
}

export function useRecruiter() {
  const { user, loading: authLoading } = useAuth();
  const [recruiter, setRecruiter] = useState<RecruiterRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setRecruiter(null); setLoading(false); return; }
    supabase.from("recruiters")
      .select("id, name, company, email, hiring_for_role, is_subscribed, subscription_plan")
      .eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { setRecruiter((data as RecruiterRow | null) ?? null); setLoading(false); });
  }, [user, authLoading]);

  return { recruiter, isRecruiter: !!recruiter, loading: authLoading || loading };
}
