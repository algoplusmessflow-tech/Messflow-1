/**
 * LeafletZoneMap — Interactive zone map with radius and polygon boundary modes.
 * Works with OpenStreetMap tiles (free, no API key).
 * Also supports Google Maps, Mapbox, etc. via tile URL config.
 *
 * Modes:
 * - Radius: Circle overlay centered on a point with adjustable km radius
 * - Boundary: Click-to-draw polygon boundary, vertices stored as JSONB
 *
 * Props:
 * - mode: 'radius' | 'boundary'
 * - center: [lat, lng] — initial center
 * - radiusKm: number — radius for circle mode
 * - polygon: [lat, lng][] — polygon vertices for boundary mode
 * - members: { lat, lng, name }[] — member locations to show as markers
 * - onCenterChange: (lat, lng) => void
 * - onPolygonChange: (vertices: [number, number][]) => void
 * - mapProvider: 'openstreetmap' | 'google' | 'mapbox' | string
 * - apiKey: string — for providers that need it
 */

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons (broken in bundlers)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const memberIcon = L.divIcon({
  html: '<div style="width:10px;height:10px;background:#3b82f6;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
  className: '',
});

const centerIcon = L.divIcon({
  html: '<div style="width:16px;height:16px;background:#ef4444;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: '',
});

interface LeafletZoneMapProps {
  mode: 'radius' | 'boundary';
  center: [number, number] | null;
  radiusKm?: number;
  polygon?: [number, number][];
  members?: { lat: number; lng: number; name: string }[];
  onCenterChange?: (lat: number, lng: number) => void;
  onPolygonChange?: (vertices: [number, number][]) => void;
  mapProvider?: string;
  apiKey?: string;
  height?: string;
}

function getTileUrl(provider?: string, apiKey?: string): { url: string; attribution: string } {
  switch (provider) {
    case 'google':
      return {
        url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        attribution: '&copy; Google Maps',
      };
    case 'mapbox':
      return {
        url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${apiKey || ''}`,
        attribution: '&copy; Mapbox',
      };
    default:
      return {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      };
  }
}

export default function LeafletZoneMap({
  mode,
  center,
  radiusKm = 5,
  polygon = [],
  members = [],
  onCenterChange,
  onPolygonChange,
  mapProvider,
  apiKey,
  height = '350px',
}: LeafletZoneMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const polygonVerticesRef = useRef<[number, number][]>(polygon);
  const memberMarkersRef = useRef<L.LayerGroup | null>(null);
  const vertexMarkersRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const defaultCenter: [number, number] = center || [25.3, 55.4]; // Sharjah default
    const tile = getTileUrl(mapProvider, apiKey);

    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer(tile.url, {
      attribution: tile.attribution,
      maxZoom: 19,
    }).addTo(map);

    memberMarkersRef.current = L.layerGroup().addTo(map);
    vertexMarkersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Click to set center (radius mode) or add vertex (boundary mode)
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (mode === 'radius') {
        onCenterChange?.(lat, lng);
      } else if (mode === 'boundary') {
        polygonVerticesRef.current = [...polygonVerticesRef.current, [lat, lng]];
        onPolygonChange?.(polygonVerticesRef.current);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map click handler when mode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.off('click');
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (mode === 'radius') {
        onCenterChange?.(lat, lng);
      } else if (mode === 'boundary') {
        polygonVerticesRef.current = [...polygonVerticesRef.current, [lat, lng]];
        onPolygonChange?.(polygonVerticesRef.current);
      }
    });
  }, [mode, onCenterChange, onPolygonChange]);

  // Draw radius circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old circle + center marker
    if (circleRef.current) { circleRef.current.remove(); circleRef.current = null; }
    if (centerMarkerRef.current) { centerMarkerRef.current.remove(); centerMarkerRef.current = null; }

    if (mode === 'radius' && center) {
      circleRef.current = L.circle(center, {
        radius: radiusKm * 1000,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 2,
      }).addTo(map);

      centerMarkerRef.current = L.marker(center, { icon: centerIcon, draggable: true }).addTo(map);
      centerMarkerRef.current.on('dragend', (e) => {
        const pos = (e.target as L.Marker).getLatLng();
        onCenterChange?.(pos.lat, pos.lng);
      });

      map.fitBounds(circleRef.current.getBounds(), { padding: [20, 20] });
    }
  }, [mode, center, radiusKm, onCenterChange]);

  // Draw polygon
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old polygon and vertex markers
    if (polygonRef.current) { polygonRef.current.remove(); polygonRef.current = null; }
    vertexMarkersRef.current?.clearLayers();

    if (mode === 'boundary' && polygon.length >= 3) {
      polygonRef.current = L.polygon(polygon, {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);

      map.fitBounds(polygonRef.current.getBounds(), { padding: [20, 20] });
    }

    // Draw vertex markers (draggable)
    if (mode === 'boundary') {
      polygon.forEach((v, i) => {
        const marker = L.circleMarker(v as L.LatLngExpression, {
          radius: 6,
          color: '#10b981',
          fillColor: '#fff',
          fillOpacity: 1,
          weight: 2,
        });
        marker.bindTooltip(`Point ${i + 1}`, { direction: 'top', offset: [0, -8] });
        vertexMarkersRef.current?.addLayer(marker);
      });
    }
  }, [mode, polygon]);

  // Draw member markers
  useEffect(() => {
    memberMarkersRef.current?.clearLayers();
    members.forEach((m) => {
      const marker = L.marker([m.lat, m.lng], { icon: memberIcon });
      marker.bindTooltip(m.name, { direction: 'top', offset: [0, -8] });
      memberMarkersRef.current?.addLayer(marker);
    });
  }, [members]);

  // Update polygon ref when prop changes
  useEffect(() => {
    polygonVerticesRef.current = polygon;
  }, [polygon]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%', borderRadius: '8px' }}
      className="border overflow-hidden z-0"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    />
  );
}
