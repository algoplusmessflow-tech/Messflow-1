-- =====================================================
-- MESSFLOW — Trial Days + Meal Type Enhancement
-- Date: 2026-03-18
-- Adds trial_days column and converts meal_type to TEXT
-- =====================================================

-- Add trial_days column to members
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT NULL;

-- Convert meal_type from enum to TEXT for custom meal types
DO $$ BEGIN
  ALTER TABLE public.members ALTER COLUMN meal_type DROP DEFAULT;
  ALTER TABLE public.members ALTER COLUMN meal_type TYPE TEXT USING meal_type::TEXT;
  ALTER TABLE public.members ALTER COLUMN meal_type SET DEFAULT 'both';
EXCEPTION WHEN others THEN NULL;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
