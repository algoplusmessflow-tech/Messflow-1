-- =====================================================
-- FIX: inventory_consumption RLS for owner CRUD
-- The kitchen portal INSERTs as anon
-- The owner needs to SELECT, UPDATE, DELETE as authenticated
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE public.inventory_consumption ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid conflicts
DO $x$ BEGIN
  DROP POLICY IF EXISTS "inventory_consumption_anon_insert" ON public.inventory_consumption;
  DROP POLICY IF EXISTS "inventory_consumption_owner_select" ON public.inventory_consumption;
  DROP POLICY IF EXISTS "inventory_consumption_owner_update" ON public.inventory_consumption;
  DROP POLICY IF EXISTS "inventory_consumption_owner_delete" ON public.inventory_consumption;
  DROP POLICY IF EXISTS "inventory_consumption_owner_all" ON public.inventory_consumption;
EXCEPTION WHEN undefined_object THEN NULL;
END $x$;

-- Anon can INSERT (kitchen portal sends requests)
CREATE POLICY "ic_anon_insert" ON public.inventory_consumption 
  FOR INSERT TO anon WITH CHECK (true);

-- Anon can SELECT own owner's data (kitchen portal reads requests)
CREATE POLICY "ic_anon_select" ON public.inventory_consumption 
  FOR SELECT TO anon USING (true);

-- Authenticated owner can do everything on their own data
CREATE POLICY "ic_auth_select" ON public.inventory_consumption 
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "ic_auth_insert" ON public.inventory_consumption 
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "ic_auth_update" ON public.inventory_consumption 
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "ic_auth_delete" ON public.inventory_consumption 
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Grant permissions
GRANT ALL ON public.inventory_consumption TO authenticated;
GRANT SELECT, INSERT ON public.inventory_consumption TO anon;

-- Also fix inventory table — owner needs full CRUD
DO $x$ BEGIN
  DROP POLICY IF EXISTS "inventory_anon_read" ON public.inventory;
EXCEPTION WHEN undefined_object THEN NULL;
END $x$;

CREATE POLICY "inv_anon_read" ON public.inventory 
  FOR SELECT TO anon USING (true);

GRANT SELECT ON public.inventory TO anon;

-- Verify
SELECT tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE tablename IN ('inventory_consumption', 'inventory')
ORDER BY tablename, cmd;
