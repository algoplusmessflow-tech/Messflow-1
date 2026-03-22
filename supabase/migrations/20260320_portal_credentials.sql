-- =====================================================
-- MESSFLOW — Customer Credentials + Kitchen Portal
-- Date: 2026-03-20
-- Adds portal_username, portal_password to members
-- Adds kitchen_access_token to profiles
-- =====================================================

-- Customer portal credentials (generated on member creation)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS portal_username TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS portal_password TEXT;

-- Kitchen team access token (generated in settings, shared via link)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kitchen_access_token TEXT;

-- Business slug (ensure it exists)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_slug TEXT;

-- Unique index on portal_username scoped to owner
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_portal_username 
  ON public.members(owner_id, portal_username) 
  WHERE portal_username IS NOT NULL;

-- Index for kitchen token lookup
CREATE INDEX IF NOT EXISTS idx_profiles_kitchen_token 
  ON public.profiles(kitchen_access_token) 
  WHERE kitchen_access_token IS NOT NULL;

-- Index for business slug lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_business_slug
  ON public.profiles(business_slug)
  WHERE business_slug IS NOT NULL;
