-- =====================================================
-- MESSFLOW — Super Admin API Configuration Columns
-- Date: 2026-03-20
-- Stores platform-wide API keys in admin's profile
-- =====================================================

-- Google OAuth (for Google Drive integration)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_google_client_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_google_client_secret TEXT;

-- Google Maps (for zone polygon drawing + geocoding)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_google_maps_key TEXT;

-- Cloudinary (current storage provider)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_cloudinary_cloud_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_cloudinary_preset TEXT;

-- WhatsApp Business API (platform-level)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_whatsapp_token TEXT;

-- Storage provider choice
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_storage_provider TEXT DEFAULT 'cloudinary';

-- All platform API configs as a single JSONB column (extensible)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform_api_config JSONB DEFAULT '{}';
