-- Add geographic columns to delivery_areas
CREATE EXTENSION IF NOT EXISTS postgis;
ALTER TABLE public.delivery_areas
  ADD COLUMN IF NOT EXISTS location GEOGRAPHY(Point, 4326),
  ADD COLUMN IF NOT EXISTS radius_km DOUBLE PRECISION DEFAULT 5;
