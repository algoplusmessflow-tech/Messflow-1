-- =====================================================
-- MESSFLOW — Delivery Completions Table
-- Date: 2026-03-24
-- Tracks completed deliveries with photo proof and location validation
-- =====================================================

-- Create delivery_completions table
CREATE TABLE IF NOT EXISTS public.delivery_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proof_photo_url TEXT,
  proof_photo_size INTEGER,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  location_matched BOOLEAN DEFAULT FALSE,
  location_match_distance_km DOUBLE PRECISION,
  location_match_threshold_km DOUBLE PRECISION DEFAULT 0.5,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'flagged')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_delivery_completions_member_id ON public.delivery_completions(member_id);
CREATE INDEX IF NOT EXISTS idx_delivery_completions_driver_id ON public.delivery_completions(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_completions_owner_id ON public.delivery_completions(owner_id);
CREATE INDEX IF NOT EXISTS idx_delivery_completions_delivery_date ON public.delivery_completions(delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_completions_completed_at ON public.delivery_completions(completed_at);

-- Enable RLS
ALTER TABLE public.delivery_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for owner access
CREATE POLICY "dc_s" ON public.delivery_completions FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "dc_i" ON public.delivery_completions FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "dc_u" ON public.delivery_completions FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "dc_d" ON public.delivery_completions FOR DELETE USING (owner_id = auth.uid());

-- Grant permissions
GRANT ALL ON public.delivery_completions TO authenticated;

-- =====================================================
-- Add delivery_status column to members if not exists
-- (for tracking individual delivery status per member)
-- =====================================================
DO $x$ BEGIN
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending';
EXCEPTION WHEN duplicate_column THEN
  BEGIN ALTER TABLE public.members ALTER COLUMN delivery_status TYPE TEXT USING delivery_status::TEXT;
  EXCEPTION WHEN others THEN NULL; END;
END $x$;

-- =====================================================
-- Update updated_at trigger function
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create or replace trigger for delivery_completions
DROP TRIGGER IF EXISTS update_delivery_completions_updated_at ON public.delivery_completions;
CREATE TRIGGER update_delivery_completions_updated_at
  BEFORE UPDATE ON public.delivery_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Run in Supabase SQL Editor
-- Then regenerate types: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
