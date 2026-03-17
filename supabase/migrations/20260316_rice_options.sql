-- =====================================================
-- MESSFLOW — Rice Options & Delivery Zones Enhancement
-- Date: 2026-03-16 (Part 2)
-- Description: Adds custom rice_options table so owners 
--   can manage their own rice types from the UI.
-- =====================================================

-- Custom rice options per owner
CREATE TABLE IF NOT EXISTS public.rice_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.rice_options ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Owners can view own rice options" ON public.rice_options;
  DROP POLICY IF EXISTS "Owners can create own rice options" ON public.rice_options;
  DROP POLICY IF EXISTS "Owners can update own rice options" ON public.rice_options;
  DROP POLICY IF EXISTS "Owners can delete own rice options" ON public.rice_options;
END $$;

CREATE POLICY "Owners can view own rice options" ON public.rice_options FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Owners can create own rice options" ON public.rice_options FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can update own rice options" ON public.rice_options FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Owners can delete own rice options" ON public.rice_options FOR DELETE USING (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_rice_options_owner ON public.rice_options(owner_id);

-- Change rice_type column from enum to TEXT so it can hold custom values
-- First check if it's still an enum and alter
DO $$ BEGIN
  ALTER TABLE public.members ALTER COLUMN rice_type DROP DEFAULT;
  ALTER TABLE public.members ALTER COLUMN rice_type TYPE TEXT USING rice_type::TEXT;
  ALTER TABLE public.members ALTER COLUMN rice_type SET DEFAULT 'white_rice';
EXCEPTION WHEN others THEN NULL;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- Run in Supabase SQL Editor, then regenerate types
-- =====================================================
