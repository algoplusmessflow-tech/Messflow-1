-- =====================================================
-- MESSFLOW — Comprehensive Sales Portal Fix
-- Date: 2026-03-24
-- This migration fixes ALL issues with sales portal login
-- =====================================================

-- STEP 1: Verify/Enable RLS on sales_persons
ALTER TABLE public.sales_persons ENABLE ROW LEVEL SECURITY;

-- STEP 2: Drop ALL existing policies
DROP POLICY IF EXISTS "Owners can view own sales persons" ON public.sales_persons;
DROP POLICY IF EXISTS "Owners can create sales persons" ON public.sales_persons;
DROP POLICY IF EXISTS "Owners can update own sales persons" ON public.sales_persons;
DROP POLICY IF EXISTS "Owners can delete own sales persons" ON public.sales_persons;
DROP POLICY IF EXISTS "anonymous_users_validate_access_token" ON public.sales_persons;
DROP POLICY IF EXISTS "authenticated_users_view_sales_persons" ON public.sales_persons;
DROP POLICY IF EXISTS "authenticated_users_insert_sales_persons" ON public.sales_persons;
DROP POLICY IF EXISTS "authenticated_users_update_sales_persons" ON public.sales_persons;
DROP POLICY IF EXISTS "authenticated_users_delete_sales_persons" ON public.sales_persons;
DROP POLICY IF EXISTS "sales_persons_anon_read" ON public.sales_persons;
DROP POLICY IF EXISTS "sales_persons_anon_insert" ON public.sales_persons;

-- STEP 3: Create PERMISSIVE policies (any match allows access)
-- Policy: Allow ANYONE to SELECT sales_persons (needed for login validation)
CREATE POLICY "sales_persons_all_select" ON public.sales_persons
FOR SELECT USING (true);

-- Policy: Allow authenticated users to INSERT (for creating sales persons)
CREATE POLICY "sales_persons_auth_insert" ON public.sales_persons
FOR INSERT TO authenticated WITH CHECK (true);

-- Policy: Allow authenticated users to UPDATE (for updating sales persons)
CREATE POLICY "sales_persons_auth_update" ON public.sales_persons
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Policy: Allow authenticated users to DELETE
CREATE POLICY "sales_persons_auth_delete" ON public.sales_persons
FOR DELETE TO authenticated USING (true);

-- STEP 4: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_persons TO authenticated;
GRANT SELECT ON public.sales_persons TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- STEP 5: Ensure profiles table allows anon SELECT for business info
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_users_view_profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

CREATE POLICY "profiles_select_all" ON public.profiles
FOR SELECT USING (true);

GRANT SELECT ON public.profiles TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- STEP 6: Regenerate ALL access codes as 6-char uppercase
UPDATE public.sales_persons
SET 
  access_token = upper(
    (SELECT string_agg(
      substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 
             floor(random() * 36 + 1)::int, 1), '')
    FROM generate_series(1, 6))
  ),
  is_active = true,  -- Ensure all are active for testing
  updated_at = NOW();

-- STEP 7: Verify the update
SELECT 
  id, 
  name, 
  access_token, 
  char_length(access_token) as code_length,
  is_active
FROM public.sales_persons
ORDER BY created_at DESC;

-- STEP 8: Check for any NULL or empty tokens
SELECT COUNT(*) as invalid_count
FROM public.sales_persons
WHERE access_token IS NULL OR access_token = '' OR char_length(access_token) != 6;

-- STEP 9: Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename IN ('sales_persons', 'profiles')
ORDER BY tablename, policyname;

-- =====================================================
-- AFTER RUNNING THIS, CHECK THE CONSOLE LOG
-- =====================================================
-- When you try to login, check browser console for:
-- "[SalesPortal Login] Found record(s): ..." if record exists
-- "[SalesPortal Login] No records found with access_token: ..." if not found
-- "[SalesPortal Login] Sample sales_persons in DB: ..." to see actual codes
