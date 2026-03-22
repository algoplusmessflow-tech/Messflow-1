-- Ensure PostGIS extension is available
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geographic columns to delivery_areas (idempotent)
ALTER TABLE public.delivery_areas
  ADD COLUMN IF NOT EXISTS location GEOGRAPHY(Point, 4326),
  ADD COLUMN IF NOT EXISTS radius_km DOUBLE PRECISION DEFAULT 5;
