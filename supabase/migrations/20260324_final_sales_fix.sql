-- =====================================================
-- MESSFLOW — Comprehensive Sales Portal Fix (Idempotent)
-- Date: 2026-03-24
-- =====================================================

-- STEP 1: Fix RLS policies (use OR REPLACE if exists)
ALTER TABLE public.sales_persons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "any_policy" ON public.sales_persons;
DROP POLICY IF EXISTS "sales_persons_all_select" ON public.sales_persons;
DROP POLICY IF EXISTS "sales_persons_anon_read" ON public.sales_persons;
DROP POLICY IF EXISTS "anonymous_users_validate_access_token" ON public.sales_persons;
DROP POLICY IF EXISTS "authenticated_users_view_sales_persons" ON public.sales_persons;
DROP POLICY IF EXISTS "authenticated_users_insert_sales_persons" ON public.sales_persons;
DROP POLICY IF EXISTS "authenticated_users_update_sales_persons" ON public.sales_persons;
DROP POLICY IF EXISTS "authenticated_users_delete_sales_persons" ON public.sales_persons;
DROP POLICY IF EXISTS "Owners can view own sales persons" ON public.sales_persons;
DROP POLICY IF EXISTS "Owners can create sales persons" ON public.sales_persons;
DROP POLICY IF EXISTS "Owners can update own sales persons" ON public.sales_persons;
DROP POLICY IF EXISTS "Owners can delete own sales persons" ON public.sales_persons;

-- Create permissive policy allowing ALL selects (for anonymous login)
CREATE POLICY "sales_persons_all_select" ON public.sales_persons
FOR SELECT USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_persons TO authenticated;
GRANT SELECT ON public.sales_persons TO anon;

-- STEP 2: Fix profiles RLS for anon access
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "any_profile_policy" ON public.profiles;
DROP POLICY IF EXISTS "anon_users_view_profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

CREATE POLICY "profiles_select_all" ON public.profiles
FOR SELECT USING (true);

GRANT SELECT ON public.profiles TO anon;

-- STEP 3: Regenerate ALL access codes
UPDATE public.sales_persons
SET 
  access_token = upper(
    (SELECT string_agg(
      substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 
             floor(random() * 36 + 1)::int, 1), '')
    FROM generate_series(1, 6))
  ),
  is_active = true,
  updated_at = NOW();

-- STEP 4: Verify
SELECT name, access_token, char_length(access_token) as len, is_active 
FROM public.sales_persons;
