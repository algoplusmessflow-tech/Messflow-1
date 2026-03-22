-- =====================================================
-- MESSFLOW — Fix delivery_areas RLS permissions
-- Date: 2026-03-18
-- Description: Drops and recreates RLS policies for 
--   delivery_areas to fix "permission denied" error.
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies (safe if they don't exist)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Owners can only view own delivery areas" ON public.delivery_areas;
  DROP POLICY IF EXISTS "Owners can only create own delivery areas" ON public.delivery_areas;
  DROP POLICY IF EXISTS "Owners can only update own delivery areas" ON public.delivery_areas;
  DROP POLICY IF EXISTS "Owners can only delete own delivery areas" ON public.delivery_areas;
  -- Also drop any generic policy names that might exist
  DROP POLICY IF EXISTS "delivery_areas_select" ON public.delivery_areas;
  DROP POLICY IF EXISTS "delivery_areas_insert" ON public.delivery_areas;
  DROP POLICY IF EXISTS "delivery_areas_update" ON public.delivery_areas;
  DROP POLICY IF EXISTS "delivery_areas_delete" ON public.delivery_areas;
  DROP POLICY IF EXISTS "Enable read access for owners" ON public.delivery_areas;
  DROP POLICY IF EXISTS "Enable insert access for owners" ON public.delivery_areas;
  DROP POLICY IF EXISTS "Enable update access for owners" ON public.delivery_areas;
  DROP POLICY IF EXISTS "Enable delete access for owners" ON public.delivery_areas;
END $$;

-- Recreate clean policies
CREATE POLICY "delivery_areas_select" ON public.delivery_areas
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "delivery_areas_insert" ON public.delivery_areas
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "delivery_areas_update" ON public.delivery_areas
  FOR UPDATE USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "delivery_areas_delete" ON public.delivery_areas
  FOR DELETE USING (owner_id = auth.uid());

-- Also fix rice_options if it has the same issue
ALTER TABLE IF EXISTS public.rice_options ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Owners can view own rice options" ON public.rice_options;
  DROP POLICY IF EXISTS "Owners can create own rice options" ON public.rice_options;
  DROP POLICY IF EXISTS "Owners can update own rice options" ON public.rice_options;
  DROP POLICY IF EXISTS "Owners can delete own rice options" ON public.rice_options;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE 'CREATE POLICY "rice_options_select" ON public.rice_options FOR SELECT USING (owner_id = auth.uid())';
  EXECUTE 'CREATE POLICY "rice_options_insert" ON public.rice_options FOR INSERT WITH CHECK (owner_id = auth.uid())';
  EXECUTE 'CREATE POLICY "rice_options_update" ON public.rice_options FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())';
  EXECUTE 'CREATE POLICY "rice_options_delete" ON public.rice_options FOR DELETE USING (owner_id = auth.uid())';
EXCEPTION WHEN undefined_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- Verify: list all policies on delivery_areas
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'delivery_areas';
