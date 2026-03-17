-- =====================================================
-- MESSFLOW — Enhanced Members Migration
-- Date: 2026-03-16
-- Description: Adds food preferences, delivery info,
--   address, service toggles to members table.
--   Adds 'custom' to plan_type enum.
--   Adds new enums for meal_type, dietary_pref, rice_type.
-- =====================================================

-- =====================================================
-- PART 1: NEW ENUMS
-- =====================================================

-- Meal type enum
DO $$ BEGIN
  CREATE TYPE public.meal_type_enum AS ENUM ('lunch', 'dinner', 'both');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Dietary preference enum
DO $$ BEGIN
  CREATE TYPE public.dietary_pref_enum AS ENUM ('veg', 'non_veg', 'both');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rice type enum
DO $$ BEGIN
  CREATE TYPE public.rice_type_enum AS ENUM ('none', 'white_rice', 'brown_rice', 'jeera_rice', 'biryani');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add 'custom' to plan_type enum (safe — only adds if not exists)
DO $$ BEGIN
  ALTER TYPE public.plan_type ADD VALUE IF NOT EXISTS 'custom';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- PART 2: ALTER MEMBERS TABLE — Add new columns
-- =====================================================

-- Address & Delivery
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS delivery_area_id UUID REFERENCES public.delivery_areas(id) ON DELETE SET NULL;

-- Special Notes
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS special_notes TEXT;

-- Food Preferences
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS meal_type public.meal_type_enum DEFAULT 'both';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS roti_quantity INTEGER DEFAULT 2;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS rice_type public.rice_type_enum DEFAULT 'white_rice';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS dietary_preference public.dietary_pref_enum DEFAULT 'both';

-- Service Toggles
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS pause_service BOOLEAN DEFAULT false;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS skip_weekends BOOLEAN DEFAULT false;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS free_trial BOOLEAN DEFAULT false;

-- =====================================================
-- PART 3: INDEXES for new columns
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_members_delivery_area ON public.members(delivery_area_id);
CREATE INDEX IF NOT EXISTS idx_members_meal_type ON public.members(meal_type);
CREATE INDEX IF NOT EXISTS idx_members_pause_service ON public.members(pause_service);

-- =====================================================
-- MIGRATION COMPLETE
-- Run this in Supabase SQL Editor, then regenerate types:
-- npx supabase gen types typescript --project-id <PROJECT_ID> > src/integrations/supabase/types.ts
-- =====================================================
