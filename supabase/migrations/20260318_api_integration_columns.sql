-- =====================================================
-- MESSFLOW — API Integration Columns for Profiles
-- Date: 2026-03-18
-- Description: Adds map_api_key, map_api_provider, and
--   custom_map_base_url columns to profiles table.
--   These are used by the Integrations settings tab.
-- =====================================================

-- Map API columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS map_api_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS map_api_provider TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_map_base_url TEXT;

-- =====================================================
-- MIGRATION COMPLETE
-- Run in Supabase SQL Editor, then regenerate types:
-- npx supabase gen types typescript --project-id wgmbwjzvgxvqvpkgmydy > src/integrations/supabase/types.ts
-- =====================================================
