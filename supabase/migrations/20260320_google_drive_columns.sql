-- =====================================================
-- MESSFLOW — Google Drive Integration Columns
-- Date: 2026-03-20
-- Stores per-user Google OAuth tokens for Drive access
-- =====================================================

-- Per-user Google Drive tokens
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_drive_folder_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_connected BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'cloudinary';
