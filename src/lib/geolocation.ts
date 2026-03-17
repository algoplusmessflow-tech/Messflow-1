export interface ParsedLocation {
  address?: string;
  lat?: number;
  lng?: number;
  mapLink?: string;
  embedUrl?: string;
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
      if (isValidCoordinate(lat, lng)) {
        return { lat, lng };
      }
    }
  }
  return null;
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function parseGoogleMapsLink(url: string): ParsedLocation | null {
  try {
    const urlObj = new URL(url);
    
    if (!urlObj.hostname.includes('google.com') && !urlObj.hostname.includes('goo.gl')) {
      return null;
    }

    const path = urlObj.pathname;
    const hash = urlObj.hash;
    const searchParams = urlObj.searchParams;

    if (path.includes('/maps/') || path.includes('/maps?')) {
      let lat: number | undefined;
      let lng: number | undefined;
      let address: string | undefined;

      const query = searchParams.get('query');
      if (query) {
        address = query;
      }

      const queryPlace = searchParams.get('query_place_id');
      if (queryPlace) {
        address = queryPlace;
      }

      const match = path.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (match) {
        lat = parseFloat(match[1]);
        lng = parseFloat(match[2]);
      }

      const daddr = searchParams.get('daddr');
      if (daddr && !address) {
        address = daddr;
      }

      if (hash) {
        const hashMatch = hash.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
        if (hashMatch) {
          lat = parseFloat(hashMatch[1]);
          lng = parseFloat(hashMatch[2]);
        }
      }

      if (lat !== undefined && lng !== undefined && isValidCoordinate(lat, lng)) {
        return {
          lat,
          lng,
          address,
          mapLink: url,
          embedUrl: `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d${Math.abs(lat * lng) || 1}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!2f90!5e0!3m2!1sen!2sae!4m2!3m1!1s`,
        };
      }

      if (address) {
        return {
          address,
          mapLink: url,
        };
      }
    }

    if (path.includes('/search/')) {
      const query = searchParams.get('query');
      if (query) {
        return {
          address: query,
          mapLink: url,
        };
      }
    }

  } catch {
    return null;
  }
  return null;
}

export async function fetchLocationFromAddress(address: string): Promise<ParsedLocation> {
  const encodedAddress = encodeURIComponent(address);
  
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;
  
  try {
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'MessFlow/1.0',
      },
    });
    
    if (!response.ok) {
      throw new Error('Geocoding service unavailable');
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      
      if (isValidCoordinate(lat, lng)) {
        const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
        const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01}%2C${lat-0.01}%2C${lng+0.01}%2C${lat+0.01}&layer=mapnik`;
        
        return {
          address: result.display_name,
          lat,
          lng,
          mapLink,
          embedUrl,
        };
      }
    }
    
    return {
      address,
      mapLink: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
    };
  } catch (error) {
    return {
      address,
      mapLink: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
    };
  }
}

export function generateEmbedUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01}%2C${lat-0.01}%2C${lng+0.01}%2C${lat+0.01}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export function sanitizeMapLink(link: string): string {
  try {
    const url = new URL(link);
    if (url.hostname.includes('google.com') || url.hostname.includes('goo.gl')) {
      return link;
    }
  } catch {
    return '';
  }
  return link;
}

export function extractCoordinatesFromInput(input: string): ParsedLocation | null {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return null;
  }

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
