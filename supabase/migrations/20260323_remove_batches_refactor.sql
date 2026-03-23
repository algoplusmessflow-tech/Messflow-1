-- =====================================================
-- MESS MANAGER PRO - Remove Batches Refactor Migration
-- Version: 2.0 (March 2026)
-- Description: Removes batch concept and enhances zone-driver assignment
-- =====================================================

-- =====================================================
-- PART 1: CREATE DRIVER-ZONE MAPPING TABLE
-- =====================================================

-- Create driver_zone_mapping table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.driver_zone_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES delivery_areas(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(driver_id, zone_id)
);

-- Enable RLS on driver_zone_mapping
ALTER TABLE public.driver_zone_mapping ENABLE ROW LEVEL SECURITY;

-- RLS policies for driver_zone_mapping
CREATE POLICY "Owners can only view own driver-zone mappings" 
ON public.driver_zone_mapping 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM drivers WHERE drivers.id = driver_zone_mapping.driver_id AND drivers.owner_id = auth.uid()
));

CREATE POLICY "Owners can only create own driver-zone mappings" 
ON public.driver_zone_mapping 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM drivers WHERE drivers.id = driver_zone_mapping.driver_id AND drivers.owner_id = auth.uid()
));

CREATE POLICY "Owners can only update own driver-zone mappings" 
ON public.driver_zone_mapping 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM drivers WHERE drivers.id = driver_zone_mapping.driver_id AND drivers.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM drivers WHERE drivers.id = driver_zone_mapping.driver_id AND drivers.owner_id = auth.uid()
));

CREATE POLICY "Owners can only delete own driver-zone mappings" 
ON public.driver_zone_mapping 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM drivers WHERE drivers.id = driver_zone_mapping.driver_id AND drivers.owner_id = auth.uid()
));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_zone_mapping_driver_id ON public.driver_zone_mapping(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_zone_mapping_zone_id ON public.driver_zone_mapping(zone_id);

-- =====================================================
-- PART 2: ADD ZONE_ID TO DRIVERS TABLE
-- =====================================================

-- Add zone_id to drivers table for single primary zone assignment
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES delivery_areas(id) ON DELETE SET NULL;

-- Index for zone_id
CREATE INDEX IF NOT EXISTS idx_drivers_zone_id ON public.drivers(zone_id);

-- =====================================================
-- PART 3: PRESERVE MEMBER DATA
-- =====================================================

-- Members already have delivery_area_id, no changes needed
-- This ensures member delivery area assignments are preserved

-- =====================================================
-- PART 4: DROP BATCH-RELATED TABLES
-- =====================================================

-- Drop batch_deliveries table first (has foreign key to delivery_batches)
DROP TABLE IF EXISTS public.batch_deliveries CASCADE;

-- Drop delivery_status_logs table (references batch_deliveries)
DROP TABLE IF EXISTS public.delivery_status_logs CASCADE;

-- Drop delivery_batches table last
DROP TABLE IF EXISTS public.delivery_batches CASCADE;

-- =====================================================
-- PART 5: VERIFY DATA INTEGRITY
-- =====================================================

-- Verify that member delivery_area_id assignments are intact
-- This query can be run manually to verify:
-- SELECT COUNT(*) as total_members, 
--        COUNT(delivery_area_id) as members_with_zone
-- FROM members 
-- WHERE status = 'active';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Run this migration in Supabase SQL Editor
-- Then update frontend components