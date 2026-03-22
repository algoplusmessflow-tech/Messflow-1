-- =====================================================
-- MESSFLOW — MASTER MIGRATION (Run this ONE file)
-- Date: 2026-03-18
-- Combines ALL pending migrations into one safe script
-- =====================================================

-- =====================================================
-- PART 1: GRANT schema access
-- =====================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- =====================================================
-- PART 2: New columns on members table
-- =====================================================
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS delivery_area_id UUID REFERENCES public.delivery_areas(id) ON DELETE SET NULL;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS special_notes TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS roti_quantity INTEGER DEFAULT 2;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS pause_service BOOLEAN DEFAULT false;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS skip_weekends BOOLEAN DEFAULT false;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS free_trial BOOLEAN DEFAULT false;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT NULL;

-- meal_type as TEXT (not enum — supports custom meal types)
DO $$ BEGIN
  ALTER TABLE public.members ADD COLUMN meal_type TEXT DEFAULT 'both';
EXCEPTION WHEN duplicate_column THEN
  BEGIN
    ALTER TABLE public.members ALTER COLUMN meal_type DROP DEFAULT;
    ALTER TABLE public.members ALTER COLUMN meal_type TYPE TEXT USING meal_type::TEXT;
    ALTER TABLE public.members ALTER COLUMN meal_type SET DEFAULT 'both';
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- rice_type as TEXT (not enum — supports custom rice types)
DO $$ BEGIN
  ALTER TABLE public.members ADD COLUMN rice_type TEXT DEFAULT 'white_rice';
EXCEPTION WHEN duplicate_column THEN
  BEGIN
    ALTER TABLE public.members ALTER COLUMN rice_type DROP DEFAULT;
    ALTER TABLE public.members ALTER COLUMN rice_type TYPE TEXT USING rice_type::TEXT;
    ALTER TABLE public.members ALTER COLUMN rice_type SET DEFAULT 'white_rice';
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- dietary_preference as TEXT
DO $$ BEGIN
  ALTER TABLE public.members ADD COLUMN dietary_preference TEXT DEFAULT 'both';
EXCEPTION WHEN duplicate_column THEN
  BEGIN
    ALTER TABLE public.members ALTER COLUMN dietary_preference DROP DEFAULT;
    ALTER TABLE public.members ALTER COLUMN dietary_preference TYPE TEXT USING dietary_preference::TEXT;
    ALTER TABLE public.members ALTER COLUMN dietary_preference SET DEFAULT 'both';
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- Add 'custom' to plan_type enum
DO $$ BEGIN
  ALTER TYPE public.plan_type ADD VALUE IF NOT EXISTS 'custom';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_members_delivery_area ON public.members(delivery_area_id);
CREATE INDEX IF NOT EXISTS idx_members_meal_type ON public.members(meal_type);
CREATE INDEX IF NOT EXISTS idx_members_pause_service ON public.members(pause_service);

-- =====================================================
-- PART 3: Profiles — API integration columns
-- =====================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS map_api_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS map_api_provider TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_map_base_url TEXT;

-- =====================================================
-- PART 4: Rice options table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.rice_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 5: Fix ALL RLS policies + GRANTs
-- =====================================================

-- Helper: drop all policies on a table
CREATE OR REPLACE FUNCTION _drop_all_policies(tbl TEXT) RETURNS void AS $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- delivery_areas
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;
SELECT _drop_all_policies('delivery_areas');
CREATE POLICY "da_s" ON public.delivery_areas FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "da_i" ON public.delivery_areas FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "da_u" ON public.delivery_areas FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "da_d" ON public.delivery_areas FOR DELETE USING (owner_id = auth.uid());
GRANT ALL ON public.delivery_areas TO authenticated;

-- drivers
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
SELECT _drop_all_policies('drivers');
CREATE POLICY "dr_s" ON public.drivers FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "dr_i" ON public.drivers FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "dr_u" ON public.drivers FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "dr_d" ON public.drivers FOR DELETE USING (owner_id = auth.uid());
GRANT ALL ON public.drivers TO authenticated;

-- delivery_batches
ALTER TABLE public.delivery_batches ENABLE ROW LEVEL SECURITY;
SELECT _drop_all_policies('delivery_batches');
CREATE POLICY "db_s" ON public.delivery_batches FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "db_i" ON public.delivery_batches FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "db_u" ON public.delivery_batches FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "db_d" ON public.delivery_batches FOR DELETE USING (owner_id = auth.uid());
GRANT ALL ON public.delivery_batches TO authenticated;

-- batch_deliveries
ALTER TABLE public.batch_deliveries ENABLE ROW LEVEL SECURITY;
SELECT _drop_all_policies('batch_deliveries');
CREATE POLICY "bd_s" ON public.batch_deliveries FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "bd_i" ON public.batch_deliveries FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "bd_u" ON public.batch_deliveries FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "bd_d" ON public.batch_deliveries FOR DELETE USING (owner_id = auth.uid());
GRANT ALL ON public.batch_deliveries TO authenticated;

-- rice_options
ALTER TABLE public.rice_options ENABLE ROW LEVEL SECURITY;
SELECT _drop_all_policies('rice_options');
CREATE POLICY "ro_s" ON public.rice_options FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "ro_i" ON public.rice_options FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "ro_u" ON public.rice_options FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "ro_d" ON public.rice_options FOR DELETE USING (owner_id = auth.uid());
GRANT ALL ON public.rice_options TO authenticated;

-- invoices
DO $$ BEGIN
  EXECUTE 'GRANT ALL ON public.invoices TO authenticated';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- invoice_items
DO $$ BEGIN
  EXECUTE 'GRANT ALL ON public.invoice_items TO authenticated';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- delivery_status_logs
DO $$ BEGIN
  ALTER TABLE public.delivery_status_logs ENABLE ROW LEVEL SECURITY;
  SELECT _drop_all_policies('delivery_status_logs');
  EXECUTE 'CREATE POLICY "dsl_s" ON public.delivery_status_logs FOR SELECT USING (owner_id = auth.uid())';
  EXECUTE 'CREATE POLICY "dsl_i" ON public.delivery_status_logs FOR INSERT WITH CHECK (owner_id = auth.uid())';
  EXECUTE 'GRANT ALL ON public.delivery_status_logs TO authenticated';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS _drop_all_policies(TEXT);

-- =====================================================
-- VERIFY: Show all policies on key tables
-- =====================================================
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('delivery_areas','drivers','delivery_batches','batch_deliveries','rice_options','members')
ORDER BY tablename, cmd;
