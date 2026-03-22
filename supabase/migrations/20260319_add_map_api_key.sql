-- Add map API key column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS map_api_key TEXT;