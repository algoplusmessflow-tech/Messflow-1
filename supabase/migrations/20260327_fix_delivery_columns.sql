-- Add delivery_area_id to members (idempotent)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS delivery_area_id UUID REFERENCES public.delivery_areas(id) ON DELETE SET NULL;

-- Add missing columns to batch_deliveries
ALTER TABLE public.batch_deliveries ADD COLUMN IF NOT EXISTS map_link TEXT;
ALTER TABLE public.batch_deliveries ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE public.batch_deliveries ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;
