-- =====================================================
-- MESS MANAGER PRO - Fix Sales Persons RLS Policies
-- Version: 1.0 (March 24, 2026)
-- Description: Fixes RLS policies to allow proper access to sales_persons table
-- =====================================================

-- First, ensure RLS is enabled on the table
ALTER TABLE public.sales_persons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Owners can view own sales persons" ON public.sales_persons;
DROP POLICY IF EXISTS "Owners can create sales persons" ON public.sales_persons;
DROP POLICY IF EXISTS "Owners can update own sales persons" ON public.sales_persons;
DROP POLICY IF EXISTS "Owners can delete own sales persons" ON public.sales_persons;

-- Create new policies with proper permissions

-- Policy 0: Allow anonymous users to validate access tokens (for sales portal login)
CREATE POLICY "anonymous_users_validate_access_token"
ON public.sales_persons
FOR SELECT
TO anon
USING (is_active = true);

-- Policy 1: Allow authenticated users to view their own sales persons
CREATE POLICY "authenticated_users_view_sales_persons"
ON public.sales_persons
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Policy 2: Allow authenticated users to insert their own sales persons
CREATE POLICY "authenticated_users_insert_sales_persons"
ON public.sales_persons
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Policy 3: Allow authenticated users to update their own sales persons
CREATE POLICY "authenticated_users_update_sales_persons"
ON public.sales_persons
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Policy 4: Allow authenticated users to delete their own sales persons
CREATE POLICY "authenticated_users_delete_sales_persons"
ON public.sales_persons
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Grant table permissions to authenticated and anonymous users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_persons TO authenticated;
GRANT SELECT ON public.sales_persons TO anon;

-- Allow anonymous users to read profiles for join queries (business_name, business_slug)
DROP POLICY IF EXISTS "anon_users_view_profiles" ON public.profiles;
CREATE POLICY "anon_users_view_profiles"
ON public.profiles
FOR SELECT
TO anon
USING (true);
GRANT SELECT ON public.profiles TO anon;

-- Verify the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'sales_persons'
ORDER BY policyname;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
