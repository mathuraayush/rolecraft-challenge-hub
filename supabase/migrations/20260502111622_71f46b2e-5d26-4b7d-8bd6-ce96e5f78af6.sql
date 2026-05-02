
ALTER TABLE public.recruiters
  ADD COLUMN IF NOT EXISTS is_subscribed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscribed_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_plan text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS allow_recruiter_contact boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.recruiter_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL,
  student_user_id uuid NOT NULL,
  contacted_at timestamptz NOT NULL DEFAULT now(),
  email_sent boolean NOT NULL DEFAULT false,
  UNIQUE (recruiter_id, student_user_id)
);

ALTER TABLE public.recruiter_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters view own contacts"
  ON public.recruiter_contacts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.recruiters r WHERE r.id = recruiter_contacts.recruiter_id AND r.user_id = auth.uid())
    OR student_user_id = auth.uid()
  );

CREATE POLICY "Recruiters insert own contacts"
  ON public.recruiter_contacts FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.recruiters r WHERE r.id = recruiter_contacts.recruiter_id AND r.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL,
  plan_type text NOT NULL,
  phone text,
  hiring_count text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recruiters view own subscription requests"
  ON public.subscription_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.recruiters r WHERE r.id = subscription_requests.recruiter_id AND r.user_id = auth.uid())
  );

CREATE POLICY "Recruiters insert own subscription requests"
  ON public.subscription_requests FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.recruiters r WHERE r.id = subscription_requests.recruiter_id AND r.user_id = auth.uid())
  );
