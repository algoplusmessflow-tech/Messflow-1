-- =====================================================
-- MESSFLOW — Comprehensive RLS & GRANT Fix
-- Date: 2026-03-18
-- Fixes: permission denied on delivery_areas, drivers, 
--   rice_options, delivery_batches, batch_deliveries
-- =====================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- =====================================================
-- delivery_areas
-- =====================================================
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'delivery_areas' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.delivery_areas', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "da_select" ON public.delivery_areas FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "da_insert" ON public.delivery_areas FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "da_update" ON public.delivery_areas FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "da_delete" ON public.delivery_areas FOR DELETE USING (owner_id = auth.uid());
GRANT ALL ON public.delivery_areas TO authenticated;

-- =====================================================
-- drivers
-- =====================================================
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'drivers' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.drivers', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "dr_select" ON public.drivers FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "dr_insert" ON public.drivers FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "dr_update" ON public.drivers FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "dr_delete" ON public.drivers FOR DELETE USING (owner_id = auth.uid());
GRANT ALL ON public.drivers TO authenticated;

-- =====================================================
-- delivery_batches
-- =====================================================
ALTER TABLE public.delivery_batches ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'delivery_batches' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.delivery_batches', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "db_select" ON public.delivery_batches FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "db_insert" ON public.delivery_batches FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "db_update" ON public.delivery_batches FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "db_delete" ON public.delivery_batches FOR DELETE USING (owner_id = auth.uid());
GRANT ALL ON public.delivery_batches TO authenticated;

-- =====================================================
-- batch_deliveries
-- =====================================================
ALTER TABLE public.batch_deliveries ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'batch_deliveries' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.batch_deliveries', pol.policyname);
  END LOOP;
END $$;
CREATE POLICY "bd_select" ON public.batch_deliveries FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "bd_insert" ON public.batch_deliveries FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "bd_update" ON public.batch_deliveries FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "bd_delete" ON public.batch_deliveries FOR DELETE USING (owner_id = auth.uid());
GRANT ALL ON public.batch_deliveries TO authenticated;

-- =====================================================
-- rice_options
-- =====================================================
DO $$ BEGIN
  ALTER TABLE public.rice_options ENABLE ROW LEVEL SECURITY;
  EXECUTE 'GRANT ALL ON public.rice_options TO authenticated';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'rice_options' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.rice_options', pol.policyname);
  END LOOP;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  EXECUTE 'CREATE POLICY "ro_select" ON public.rice_options FOR SELECT USING (owner_id = auth.uid())';
  EXECUTE 'CREATE POLICY "ro_insert" ON public.rice_options FOR INSERT WITH CHECK (owner_id = auth.uid())';
  EXECUTE 'CREATE POLICY "ro_update" ON public.rice_options FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())';
  EXECUTE 'CREATE POLICY "ro_delete" ON public.rice_options FOR DELETE USING (owner_id = auth.uid())';
EXCEPTION WHEN undefined_table THEN NULL;
         WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- invoices & invoice_items (also fix while we're at it)
-- =====================================================
GRANT ALL ON public.invoices TO authenticated;
GRANT ALL ON public.invoice_items TO authenticated;

-- =====================================================
-- Verify
-- =====================================================
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('delivery_areas', 'drivers', 'delivery_batches', 'batch_deliveries', 'rice_options')
ORDER BY tablename, cmd;
