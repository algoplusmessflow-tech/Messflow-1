-- Add driver_id to delivery_areas to assign drivers to zones
ALTER TABLE public.delivery_areas ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_areas_driver_id ON public.delivery_areas(driver_id);
