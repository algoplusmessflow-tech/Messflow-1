-- =====================================================
-- MESSFLOW — Fix Profiles RLS for Sales Portal
-- =====================================================

-- Fix profiles table RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "any_profile" ON public.profiles;

CREATE POLICY "profiles_select_all" ON public.profiles
FOR SELECT USING (true);

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
