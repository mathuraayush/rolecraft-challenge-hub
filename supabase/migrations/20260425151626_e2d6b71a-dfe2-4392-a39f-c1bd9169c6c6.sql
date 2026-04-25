
-- Roles catalog (public read)
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users profile (mirrors auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  college TEXT,
  city TEXT,
  bio TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  role TEXT,
  level TEXT,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Projects generated per role
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  context TEXT,
  deliverables TEXT,
  evaluation_rubric TEXT,
  difficulty_level TEXT,
  domain TEXT,
  focus_area TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Submissions
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  approach_text TEXT,
  problem_understanding TEXT,
  proposed_solution TEXT,
  tradeoffs TEXT,
  success_metrics TEXT,
  reflection_text TEXT,
  submission_link TEXT,
  submission_type TEXT CHECK (submission_type IN ('github','gdoc','notion','figma','other')),
  fetched_content TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','graded')),
  ai_score INTEGER,
  ai_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Portfolios
CREATE TABLE public.portfolios (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT true,
  headline TEXT,
  is_available_for_hire BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recruiters
CREATE TABLE public.recruiters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  company_size TEXT,
  hiring_for_role TEXT,
  email TEXT NOT NULL,
  saved_searches JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiters ENABLE ROW LEVEL SECURITY;

-- Roles: public read
CREATE POLICY "Roles are viewable by everyone" ON public.roles FOR SELECT USING (true);

-- Users: anyone can view (portfolios are public). Users edit/insert their own.
CREATE POLICY "Users viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users insert own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Projects: viewable by everyone (public portfolios show submissions->projects).
-- Owner manages their generated projects.
CREATE POLICY "Projects viewable by everyone" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Projects insert own" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Projects update own" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Projects delete own" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Submissions: public read (so portfolios visible). Owner manages.
CREATE POLICY "Submissions viewable by everyone" ON public.submissions FOR SELECT USING (true);
CREATE POLICY "Submissions insert own" ON public.submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Submissions update own" ON public.submissions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Submissions delete own" ON public.submissions FOR DELETE USING (auth.uid() = user_id);

-- Portfolios: viewable by everyone. Owner manages.
CREATE POLICY "Portfolios viewable by everyone" ON public.portfolios FOR SELECT USING (true);
CREATE POLICY "Portfolios insert own" ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Portfolios update own" ON public.portfolios FOR UPDATE USING (auth.uid() = user_id);

-- Recruiters: own record only
CREATE POLICY "Recruiters view own" ON public.recruiters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Recruiters insert own" ON public.recruiters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Recruiters update own" ON public.recruiters FOR UPDATE USING (auth.uid() = user_id);

-- Auto-create user profile + portfolio on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.portfolios (user_id, is_public, is_available_for_hire)
  VALUES (NEW.id, true, true)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
