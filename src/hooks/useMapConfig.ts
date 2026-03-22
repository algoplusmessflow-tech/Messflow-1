import { useProfile } from '@/hooks/useProfile';
import { usePlatformConfig } from '@/hooks/usePlatformConfig';
import type { MapApiConfig } from '@/lib/geolocation';

/**
 * Hook that returns the map API configuration.
 * Priority:
 * 1. User's own map settings (if configured in their Settings > Integrations)
 * 2. Platform-level Google Maps key (set by SuperAdmin in API & Services)
 * 3. OpenStreetMap (free default, no key needed)
 */
export function useMapConfig(): MapApiConfig {
  const { profile } = useProfile();
  const { config: platformConfig } = usePlatformConfig();

  // User's own config takes priority
  const p = profile as any;
  if (p?.map_api_key) {
    return {
      provider: p.map_api_provider || 'openstreetmap',
      apiKey: p.map_api_key,
      customBaseUrl: p.custom_map_base_url || '',
    };
  }

  // Fall back to platform-level Google Maps key from SuperAdmin
  if (platformConfig?.google_maps_key) {
    return {
      provider: 'google',
      apiKey: platformConfig.google_maps_key,
      customBaseUrl: '',
    };
  }

  // Default: OpenStreetMap (free, no key)
  return {
    provider: 'openstreetmap',
    apiKey: '',
    customBaseUrl: '',
  };
}
