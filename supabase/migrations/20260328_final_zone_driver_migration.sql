-- =====================================================
-- MESSFLOW — ZONE-DRIVER ASSIGNMENT MIGRATION
-- Date: 2026-03-23
-- Description: Remove batch tables, add driver_zone_mapping
-- =====================================================

-- =====================================================
-- PART 1: CREATE DRIVER-ZONE MAPPING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.driver_zone_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES delivery_areas(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(driver_id, zone_id)
);

ALTER TABLE public.driver_zone_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dzm_s" ON public.driver_zone_mapping FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM drivers WHERE drivers.id = driver_zone_mapping.driver_id AND drivers.owner_id = auth.uid()
  )
);

CREATE POLICY "dzm_i" ON public.driver_zone_mapping FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM drivers WHERE drivers.id = driver_zone_mapping.driver_id AND drivers.owner_id = auth.uid()
  )
);

CREATE POLICY "dzm_u" ON public.driver_zone_mapping FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM drivers WHERE drivers.id = driver_zone_mapping.driver_id AND drivers.owner_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM drivers WHERE drivers.id = driver_zone_mapping.driver_id AND drivers.owner_id = auth.uid()
  )
);

CREATE POLICY "dzm_d" ON public.driver_zone_mapping FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM drivers WHERE drivers.id = driver_zone_mapping.driver_id AND drivers.owner_id = auth.uid()
  )
);

GRANT ALL ON public.driver_zone_mapping TO authenticated;

CREATE INDEX IF NOT EXISTS idx_driver_zone_mapping_driver_id ON public.driver_zone_mapping(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_zone_mapping_zone_id ON public.driver_zone_mapping(zone_id);

-- =====================================================
-- PART 2: ADD DRIVER_ID TO DELIVERY_AREAS
-- =====================================================

ALTER TABLE public.delivery_areas ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_areas_driver_id ON public.delivery_areas(driver_id);

-- =====================================================
-- PART 3: MIGRATE EXISTING DRIVER ASSIGNMENTS
-- =====================================================

-- If any drivers have zone_id set (from earlier migrations), migrate to driver_zone_mapping
INSERT INTO public.driver_zone_mapping (driver_id, zone_id, assigned_at)
SELECT d.id, d.zone_id, NOW()
FROM public.drivers d
WHERE d.zone_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.driver_zone_mapping dzm 
  WHERE dzm.driver_id = d.id AND dzm.zone_id = d.zone_id
);

-- =====================================================
-- PART 4: DROP BATCH-RELATED TABLES
-- =====================================================

-- Drop tables in correct order (foreign keys first)
DROP TABLE IF EXISTS public.batch_deliveries CASCADE;
DROP TABLE IF EXISTS public.delivery_status_logs CASCADE;
DROP TABLE IF EXISTS public.delivery_batches CASCADE;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check tables exist
SELECT 'driver_zone_mapping exists: ' || EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'driver_zone_mapping'
) AS result;

SELECT 'delivery_batches dropped: ' || NOT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'delivery_batches'
) AS result;

SELECT 'batch_deliveries dropped: ' || NOT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'batch_deliveries'
) AS result;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Run in Supabase SQL Editor
-- Then regenerate types: npx supabase gen types typescript --project-id wgmbwjzvgxvqvpkgmydy > src/integrations/supabase/types.ts
