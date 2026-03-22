-- =====================================================
-- MESSFLOW — Zone Perimeter (km radius) Feature
-- Date: 2026-03-19
-- Adds center lat/lng and radius_km to delivery_areas
-- Adds location_lat/lng to members for distance calc
-- =====================================================

-- Zone center coordinates + radius
ALTER TABLE public.delivery_areas ADD COLUMN IF NOT EXISTS center_lat DOUBLE PRECISION;
ALTER TABLE public.delivery_areas ADD COLUMN IF NOT EXISTS center_lng DOUBLE PRECISION;
ALTER TABLE public.delivery_areas ADD COLUMN IF NOT EXISTS radius_km DOUBLE PRECISION DEFAULT 5;

-- Member location coordinates
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;

-- Index for geo queries
CREATE INDEX IF NOT EXISTS idx_delivery_areas_geo ON public.delivery_areas(center_lat, center_lng);
CREATE INDEX IF NOT EXISTS idx_members_geo ON public.members(location_lat, location_lng);

-- =====================================================
-- MIGRATION COMPLETE
-- Run in Supabase SQL Editor, then regenerate types
-- =====================================================
