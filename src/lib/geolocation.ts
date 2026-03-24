export interface ParsedLocation {
  address?: string;
  lat?: number;
  lng?: number;
  mapLink?: string;
  embedUrl?: string;
}

export interface MapApiConfig {
  provider?: string;
  apiKey?: string;
  customBaseUrl?: string;
}

// Track if Google Maps script is loaded
let googleMapsLoaded = false;
let googleMapsLoading = false;
const googleMapsCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (googleMapsLoaded && (window as any).google?.maps) return Promise.resolve();

  return new Promise((resolve, reject) => {
    if (googleMapsLoading) {
      googleMapsCallbacks.push(resolve);
      return;
    }

    // Check if already loaded by another script
    if ((window as any).google?.maps?.Geocoder) {
      googleMapsLoaded = true;
      resolve();
      return;
    }

    googleMapsLoading = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geocoding`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleMapsLoaded = true;
      googleMapsLoading = false;
      resolve();
      googleMapsCallbacks.forEach((cb) => cb());
      googleMapsCallbacks.length = 0;
    };
    script.onerror = () => {
      googleMapsLoading = false;
      reject(new Error('Failed to load Google Maps script'));
    };
    document.head.appendChild(script);
  });
}

async function geocodeWithGoogle(address: string, apiKey: string): Promise<ParsedLocation> {
  await loadGoogleMapsScript(apiKey);

  return new Promise((resolve) => {
    const geocoder = new (window as any).google.maps.Geocoder();
    geocoder.geocode({ address }, (results: any, status: string) => {
      if (status === 'OK' && results?.[0]) {
        const result = results[0];
        const lat = result.geometry.location.lat();
        const lng = result.geometry.location.lng();
        resolve({
          address: result.formatted_address,
          lat,
          lng,
          mapLink: `https://www.google.com/maps?q=${lat},${lng}`,
          embedUrl: `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}&zoom=15`,
        });
      } else {
        resolve({ address, mapLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` });
      }
    });
  });
}

export function parseCoordinate(input: string): { lat: number; lng: number } | null {
  const patterns = [
    /^\s*(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)\s*$/,
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /place\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (isValidCoordinate(lat, lng)) return { lat, lng };
    }
  }
  return null;
}

/**
 * Calculate distance between two lat/lng points using Haversine formula.
 * Returns distance in kilometers.
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a member location is within a zone's radius.
 */
export function isWithinZone(
  memberLat: number, memberLng: number,
  zoneLat: number, zoneLng: number,
  radiusKm: number
): boolean {
  return haversineDistance(memberLat, memberLng, zoneLat, zoneLng) <= radiusKm;
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function parseGoogleMapsLink(url: string): ParsedLocation | null {
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname.includes('google.com') && !urlObj.hostname.includes('goo.gl')) return null;

    const path = urlObj.pathname;
    const hash = urlObj.hash;
    const searchParams = urlObj.searchParams;

    let lat: number | undefined;
    let lng: number | undefined;
    let address: string | undefined;

    const query = searchParams.get('query');
    if (query) address = query;
    const daddr = searchParams.get('daddr');
    if (daddr && !address) address = daddr;

    const match = path.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (match) { lat = parseFloat(match[1]); lng = parseFloat(match[2]); }

    if (hash) {
      const hashMatch = hash.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (hashMatch) { lat = parseFloat(hashMatch[1]); lng = parseFloat(hashMatch[2]); }
    }

    if (lat !== undefined && lng !== undefined && isValidCoordinate(lat, lng)) {
      return { lat, lng, address, mapLink: url };
    }
    if (address) return { address, mapLink: url };
  } catch { /* ignore */ }
  return null;
}

/**
 * Geocode an address using the configured provider.
 * 
 * Google Maps: Uses the JS Geocoder (CORS-safe, no server needed)
 * Others: Use their REST APIs (all CORS-friendly)
 * Default: OpenStreetMap Nominatim (free, no key)
 */
export async function fetchLocationFromAddress(
  address: string,
  config?: MapApiConfig
): Promise<ParsedLocation> {
  const encodedAddress = encodeURIComponent(address);
  const provider = config?.provider || 'openstreetmap';
  const apiKey = config?.apiKey || '';

  try {
    // Google Maps — use JS Geocoder (NOT the REST API which blocks CORS)
    if (provider === 'google' && apiKey) {
      return await geocodeWithGoogle(address, apiKey);
    }

    // LocationIQ — CORS-friendly REST API
    if (provider === 'locationiq' && apiKey) {
      const url = `https://us1.locationiq.com/v1/search?key=${apiKey}&q=${encodedAddress}&format=json&limit=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`LocationIQ ${res.status}`);
      const json = await res.json();
      if (json?.[0]) {
        const r = json[0];
        const lat = parseFloat(r.lat);
        const lng = parseFloat(r.lon);
        return { address: r.display_name, lat, lng, mapLink: `https://www.google.com/maps?q=${lat},${lng}`, embedUrl: generateEmbedUrl(lat, lng, config) };
      }
    }

    // Mapbox — CORS-friendly REST API
    if (provider === 'mapbox' && apiKey) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${apiKey}&limit=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Mapbox ${res.status}`);
      const json = await res.json();
      if (json.features?.[0]) {
        const feat = json.features[0];
        const [lng, lat] = feat.center;
        return { address: feat.place_name, lat, lng, mapLink: `https://www.google.com/maps?q=${lat},${lng}`, embedUrl: generateEmbedUrl(lat, lng, config) };
      }
    }

    // HERE — CORS-friendly REST API
    if (provider === 'here' && apiKey) {
      const url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodedAddress}&apiKey=${apiKey}&limit=1`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HERE ${res.status}`);
      const json = await res.json();
      if (json.items?.[0]) {
        const item = json.items[0];
        const lat = item.position.lat;
        const lng = item.position.lng;
        return { address: item.address.label, lat, lng, mapLink: `https://www.google.com/maps?q=${lat},${lng}`, embedUrl: generateEmbedUrl(lat, lng, config) };
      }
    }

    // Custom provider — expects Nominatim-compatible response
    if (provider === 'custom' && apiKey && config?.customBaseUrl) {
      const url = `${config.customBaseUrl}/search?format=json&q=${encodedAddress}&limit=1&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Custom ${res.status}`);
      const json = await res.json();
      if (json?.[0]) {
        const r = json[0];
        const lat = parseFloat(r.lat);
        const lng = parseFloat(r.lon || r.lng);
        return { address: r.display_name || r.address, lat, lng, mapLink: `https://www.google.com/maps?q=${lat},${lng}`, embedUrl: generateEmbedUrl(lat, lng, config) };
      }
    }

    // Default: OpenStreetMap Nominatim (free, no key, CORS-friendly)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'MessFlow/1.0' } });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const json = await res.json();
    if (json?.[0]) {
      const r = json[0];
      const lat = parseFloat(r.lat);
      const lng = parseFloat(r.lon);
      if (isValidCoordinate(lat, lng)) {
        return { address: r.display_name, lat, lng, mapLink: `https://www.google.com/maps?q=${lat},${lng}`, embedUrl: generateEmbedUrl(lat, lng, config) };
      }
    }

    return { address, mapLink: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}` };
  } catch (error) {
    console.error('Geocoding error:', error);
    return { address, mapLink: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}` };
  }
}

export function generateEmbedUrl(lat: number, lng: number, config?: MapApiConfig): string {
  if (config?.provider === 'google' && config?.apiKey) {
    return `https://www.google.com/maps/embed/v1/place?key=${config.apiKey}&q=${lat},${lng}&zoom=15`;
  }
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export function sanitizeMapLink(link: string): string {
  try {
    const url = new URL(link);
    if (url.hostname.includes('google.com') || url.hostname.includes('goo.gl') || url.hostname.includes('openstreetmap')) return link;
  } catch { return ''; }
  return link;
}

export function extractCoordinatesFromInput(input: string): ParsedLocation | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return parseGoogleMapsLink(trimmed);
  }

  const coords = parseCoordinate(trimmed);
  if (coords) {
    return {
      lat: coords.lat,
      lng: coords.lng,
      mapLink: `https://www.google.com/maps?q=${coords.lat},${coords.lng}`,
      embedUrl: generateEmbedUrl(coords.lat, coords.lng),
    };
  }

  return null;
}


/**
 * Ray-casting point-in-polygon test.
 * Returns true if the point (lat, lng) is inside the polygon defined by vertices.
 * Vertices are [[lat, lng], [lat, lng], ...]
 */
export function pointInPolygon(
  lat: number,
  lng: number,
  polygon: [number, number][]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i][0], xi = polygon[i][1];
    const yj = polygon[j][0], xj = polygon[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Check if a member is within a zone (supports both radius and polygon modes).
 */
export function isMemberInZone(
  memberLat: number,
  memberLng: number,
  zone: {
    zone_mode?: string;
    center_lat?: number | null;
    center_lng?: number | null;
    radius_km?: number | null;
    boundary_polygon?: [number, number][] | null;
  }
): boolean {
  if (zone.zone_mode === 'boundary' && zone.boundary_polygon && zone.boundary_polygon.length >= 3) {
    return pointInPolygon(memberLat, memberLng, zone.boundary_polygon);
  }
  // Default: radius mode
  if (zone.center_lat && zone.center_lng && zone.radius_km) {
    return haversineDistance(memberLat, memberLng, zone.center_lat, zone.center_lng) <= zone.radius_km;
  }
  return false;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeolocationResult {
  coords: Coordinates;
  accuracy: number;
  timestamp: number;
}

export interface LocationValidationResult {
  isWithinPerimeter: boolean;
  distanceKm: number;
  thresholdKm: number;
  memberCoords: Coordinates | null;
  driverCoords: Coordinates | null;
}

export async function getCurrentLocation(): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        let message = 'Unable to retrieve location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out.';
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

export function checkLocationWithinPerimeter(
  driverCoords: Coordinates,
  memberCoords: Coordinates | null,
  thresholdKm: number = 0.5
): LocationValidationResult {
  if (!memberCoords) {
    return {
      isWithinPerimeter: false,
      distanceKm: 0,
      thresholdKm,
      memberCoords: null,
      driverCoords,
    };
  }

  const distanceKm = haversineDistance(
    driverCoords.lat,
    driverCoords.lng,
    memberCoords.lat,
    memberCoords.lng
  );

  return {
    isWithinPerimeter: distanceKm <= thresholdKm,
    distanceKm,
    thresholdKm,
    memberCoords,
    driverCoords,
  };
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(2)} km`;
}

export function isValidLatLng(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function getLocationPermissionStatus(): Promise<PermissionState> {
  if (!navigator.permissions) {
    return Promise.resolve('prompt');
  }

  return navigator.permissions
    .query({ name: 'geolocation' })
    .then((result) => result.state)
    .catch(() => 'prompt');
}
