import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformApiConfig {
  google_client_id?: string;
  google_client_secret?: string;
  google_maps_key?: string;
  cloudinary_cloud_name?: string;
  cloudinary_upload_preset?: string;
  whatsapp_api_token?: string;
  storage_provider?: 'cloudinary' | 'google_drive';
  supabase_url?: string;
  supabase_anon_key?: string;
}

/**
 * Hook to read platform-wide API configuration.
 * Any page can call this to get API keys configured by the Super Admin.
 * Falls back to environment variables if no DB config exists.
 */
export function usePlatformConfig() {
  const { data: config, isLoading } = useQuery({
    queryKey: ['platform-api-config'],
    queryFn: async () => {
      // Find any super admin's profile that has platform_api_config
      const { data } = await supabase
        .from('profiles')
        .select('platform_api_config')
        .not('platform_api_config', 'is', null)
        .limit(1)
        .maybeSingle();

      const dbConfig = (data?.platform_api_config as PlatformApiConfig) || {};

      // Merge with env vars as fallbacks
      return {
        google_client_id: dbConfig.google_client_id || '',
        google_client_secret: dbConfig.google_client_secret || '',
        google_maps_key: dbConfig.google_maps_key || '',
        cloudinary_cloud_name: dbConfig.cloudinary_cloud_name || import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '',
        cloudinary_upload_preset: dbConfig.cloudinary_upload_preset || import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '',
        whatsapp_api_token: dbConfig.whatsapp_api_token || '',
        storage_provider: dbConfig.storage_provider || 'cloudinary',
        supabase_url: import.meta.env.VITE_SUPABASE_URL || '',
        supabase_anon_key: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      } as PlatformApiConfig;
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  return {
    config: config || {} as PlatformApiConfig,
    isLoading,
    hasGoogleMaps: !!(config?.google_maps_key),
    hasGoogleDrive: !!(config?.google_client_id && config?.google_client_secret),
    hasCloudinary: !!(config?.cloudinary_cloud_name),
    hasWhatsapp: !!(config?.whatsapp_api_token),
    storageProvider: config?.storage_provider || 'cloudinary',
  };
}
