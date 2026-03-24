-- =====================================================
-- MESSFLOW — FINAL COMBINED MIGRATION (SAFE VERSION)
-- Date: 2026-03-20 (Updated 2026-03-24)
-- Run this ONE file to bring the database up to date.
-- All statements are idempotent and safe to re-run.
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- =====================================================
-- MEMBERS — Extended columns
-- =====================================================
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS delivery_area_id UUID;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS special_notes TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS roti_quantity INTEGER DEFAULT 2;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS pause_service BOOLEAN DEFAULT false;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS skip_weekends BOOLEAN DEFAULT false;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS free_trial BOOLEAN DEFAULT false;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS trial_days INTEGER;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS portal_username TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS portal_password TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS sales_person_id UUID;

DO $x$ BEGIN ALTER TABLE public.members ADD COLUMN meal_type TEXT DEFAULT 'both';
EXCEPTION WHEN duplicate_column THEN
  BEGIN ALTER TABLE public.members ALTER COLUMN meal_type TYPE TEXT USING meal_type::TEXT;
  EXCEPTION WHEN others THEN NULL; END;
END $x$;

DO $x$ BEGIN ALTER TABLE public.members ADD COLUMN rice_type TEXT DEFAULT 'white_rice';
EXCEPTION WHEN duplicate_column THEN
  BEGIN ALTER TABLE public.members ALTER COLUMN rice_type TYPE TEXT USING rice_type::TEXT;
  EXCEPTION WHEN others THEN NULL; END;
END $x$;

DO $x$ BEGIN ALTER TABLE public.members ADD COLUMN dietary_preference TEXT DEFAULT 'both';
EXCEPTION WHEN duplicate_column THEN
  BEGIN ALTER TABLE public.members ALTER COLUMN dietary_preference TYPE TEXT USING dietary_preference::TEXT;
  EXCEPTION WHEN others THEN NULL; END;
END $x$;

CREATE INDEX IF NOT EXISTS idx_members_delivery_area ON public.members(delivery_area_id);
CREATE INDEX IF NOT EXISTS idx_members_geo ON public.members(location_lat, location_lng);

DO $x$ BEGIN
  CREATE UNIQUE INDEX idx_members_portal_username ON public.members(owner_id, portal_username) WHERE portal_username IS NOT NULL;
EXCEPTION WHEN duplicate_table THEN NULL; END $x$;

-- Backfill portal credentials
UPDATE public.members 
SET portal_username = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')) || FLOOR(1000 + RANDOM() * 9000)::TEXT,
    portal_password = SUBSTR(MD5(RANDOM()::TEXT), 1, 6)
WHERE portal_username IS NULL AND name IS NOT NULL;

-- =====================================================
-- DELIVERY_AREAS — Zone perimeter + boundary columns
-- =====================================================
ALTER TABLE public.delivery_areas ADD COLUMN IF NOT EXISTS center_lat DOUBLE PRECISION;
ALTER TABLE public.delivery_areas ADD COLUMN IF NOT EXISTS center_lng DOUBLE PRECISION;
ALTER TABLE public.delivery_areas ADD COLUMN IF NOT EXISTS radius_km DOUBLE PRECISION DEFAULT 5;
ALTER TABLE public.delivery_areas ADD COLUMN IF NOT EXISTS boundary_polygon JSONB;
ALTER TABLE public.delivery_areas ADD COLUMN IF NOT EXISTS zone_mode TEXT DEFAULT 'radius';
ALTER TABLE public.delivery_areas ADD COLUMN IF NOT EXISTS driver_id UUID;

-- Add FK if not exists (needed for PostgREST joins)
DO $x$ BEGIN
  ALTER TABLE public.delivery_areas
    ADD CONSTRAINT fk_delivery_areas_driver
    FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $x$;
CREATE INDEX IF NOT EXISTS idx_delivery_areas_geo ON public.delivery_areas(center_lat, center_lng);

-- Unique zone name per owner (case-insensitive)
DO $x$ BEGIN
  CREATE UNIQUE INDEX idx_delivery_areas_unique_name
    ON public.delivery_areas (owner_id, LOWER(name));
EXCEPTION WHEN duplicate_table THEN NULL;
END $x$;

-- =====================================================
-- PROFILES — All integration columns
-- =====================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS map_api_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS map_api_provider TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_map_base_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_api_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_slug TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kitchen_access_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'cloudinary';

-- Google Drive
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_connected BOOLEAN DEFAULT false;

-- Google Sheets backup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_sheets_id TEXT;

-- Super Admin
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_api_config JSONB DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_gateway_config JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_platform_gateway_enabled BOOLEAN DEFAULT false;

DO $x$ BEGIN
  CREATE UNIQUE INDEX idx_profiles_business_slug ON public.profiles(business_slug) WHERE business_slug IS NOT NULL;
EXCEPTION WHEN duplicate_table THEN NULL; END $x$;

UPDATE public.profiles
SET business_slug = LOWER(REGEXP_REPLACE(business_name, '[^a-zA-Z0-9]', '', 'g')) || '_' || SUBSTR(MD5(user_id::TEXT), 1, 4)
WHERE business_slug IS NULL AND business_name IS NOT NULL;

-- =====================================================
-- RICE_OPTIONS table
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
-- RLS POLICIES + GRANTS (only for tables that EXIST)
-- =====================================================

-- Helper function to drop existing policies
CREATE OR REPLACE FUNCTION _mf_drop_policies(tbl TEXT) RETURNS void AS $fn$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
  END LOOP;
END; $fn$ LANGUAGE plpgsql;

-- delivery_areas
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;
SELECT _mf_drop_policies('delivery_areas');
CREATE POLICY "da_s" ON public.delivery_areas FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "da_i" ON public.delivery_areas FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "da_u" ON public.delivery_areas FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "da_d" ON public.delivery_areas FOR DELETE USING (owner_id = auth.uid());
GRANT ALL ON public.delivery_areas TO authenticated;

-- drivers
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
SELECT _mf_drop_policies('drivers');
CREATE POLICY "dr_s" ON public.drivers FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "dr_i" ON public.drivers FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "dr_u" ON public.drivers FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "dr_d" ON public.drivers FOR DELETE USING (owner_id = auth.uid());
GRANT ALL ON public.drivers TO authenticated;

-- delivery_batches (ONLY if table exists)
DO $x$ BEGIN
  ALTER TABLE public.delivery_batches ENABLE ROW LEVEL SECURITY;
  PERFORM _mf_drop_policies('delivery_batches');
  EXECUTE 'CREATE POLICY "db_s" ON public.delivery_batches FOR SELECT USING (owner_id = auth.uid())';
  EXECUTE 'CREATE POLICY "db_i" ON public.delivery_batches FOR INSERT WITH CHECK (owner_id = auth.uid())';
  EXECUTE 'CREATE POLICY "db_u" ON public.delivery_batches FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())';
  EXECUTE 'CREATE POLICY "db_d" ON public.delivery_batches FOR DELETE USING (owner_id = auth.uid())';
  EXECUTE 'GRANT ALL ON public.delivery_batches TO authenticated';
EXCEPTION WHEN undefined_table THEN NULL; END $x$;

-- batch_deliveries (ONLY if table exists)
DO $x$ BEGIN
  ALTER TABLE public.batch_deliveries ENABLE ROW LEVEL SECURITY;
  PERFORM _mf_drop_policies('batch_deliveries');
  EXECUTE 'CREATE POLICY "bd_s" ON public.batch_deliveries FOR SELECT USING (owner_id = auth.uid())';
  EXECUTE 'CREATE POLICY "bd_i" ON public.batch_deliveries FOR INSERT WITH CHECK (owner_id = auth.uid())';
  EXECUTE 'CREATE POLICY "bd_u" ON public.batch_deliveries FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())';
  EXECUTE 'CREATE POLICY "bd_d" ON public.batch_deliveries FOR DELETE USING (owner_id = auth.uid())';
  EXECUTE 'GRANT ALL ON public.batch_deliveries TO authenticated';
EXCEPTION WHEN undefined_table THEN NULL; END $x$;

-- rice_options
ALTER TABLE public.rice_options ENABLE ROW LEVEL SECURITY;
SELECT _mf_drop_policies('rice_options');
CREATE POLICY "ro_s" ON public.rice_options FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "ro_i" ON public.rice_options FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "ro_u" ON public.rice_options FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "ro_d" ON public.rice_options FOR DELETE USING (owner_id = auth.uid());
GRANT ALL ON public.rice_options TO authenticated;

-- invoices + invoice_items (ONLY if they exist)
DO $x$ BEGIN EXECUTE 'GRANT ALL ON public.invoices TO authenticated'; EXCEPTION WHEN undefined_table THEN NULL; END $x$;
DO $x$ BEGIN EXECUTE 'GRANT ALL ON public.invoice_items TO authenticated'; EXCEPTION WHEN undefined_table THEN NULL; END $x$;

-- Clean up helper
DROP FUNCTION IF EXISTS _mf_drop_policies(TEXT);

-- =====================================================
-- KITCHENS table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.kitchens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  manager_name TEXT,
  address TEXT,
  phone TEXT,
  tiffin_capacity INTEGER DEFAULT 100,
  access_code TEXT NOT NULL DEFAULT SUBSTR(MD5(RANDOM()::TEXT), 1, 6),
  nearby_zones JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $x$ BEGIN
  ALTER TABLE public.kitchens ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "kitchens_auth_all" ON public.kitchens FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
  EXECUTE 'GRANT ALL ON public.kitchens TO authenticated';
  CREATE POLICY "kitchens_anon_read" ON public.kitchens FOR SELECT TO anon USING (true);
  EXECUTE 'GRANT SELECT ON public.kitchens TO anon';
EXCEPTION WHEN duplicate_object THEN NULL;
END $x$;

-- =====================================================
-- ENABLE REALTIME on members table (for Sheets sync)
-- =====================================================
DO $x$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
EXCEPTION WHEN duplicate_object THEN NULL;
END $x$;

-- =====================================================
-- VERIFY
-- =====================================================
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('delivery_areas','drivers','rice_options','members')
ORDER BY tablename, cmd;
