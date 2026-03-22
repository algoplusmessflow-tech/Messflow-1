-- =====================================================
-- MESSFLOW — Zone Perimeter + Member Location
-- Date: 2026-03-18
-- Adds center coordinates + radius to delivery_areas
-- Adds location coordinates to members
-- =====================================================

-- Zone center coordinates and radius
ALTER TABLE public.delivery_areas ADD COLUMN IF NOT EXISTS center_lat DOUBLE PRECISION;
ALTER TABLE public.delivery_areas ADD COLUMN IF NOT EXISTS center_lng DOUBLE PRECISION;
ALTER TABLE public.delivery_areas ADD COLUMN IF NOT EXISTS radius_km DOUBLE PRECISION DEFAULT 5;

-- Member location coordinates (for distance calculation)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;

-- Haversine distance function (returns km between two lat/lng points)
CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  R DOUBLE PRECISION := 6371; -- Earth radius in km
  dlat DOUBLE PRECISION;
  dlng DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dlat := RADIANS(lat2 - lat1);
  dlng := RADIANS(lng2 - lng1);
  a := SIN(dlat/2) * SIN(dlat/2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlng/2) * SIN(dlng/2);
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get members within a zone's radius
CREATE OR REPLACE FUNCTION get_members_in_zone(
  zone_id UUID,
  p_owner_id UUID
) RETURNS TABLE(
  member_id UUID,
  member_name TEXT,
  member_phone TEXT,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.name,
    m.phone,
    haversine_distance(da.center_lat, da.center_lng, m.location_lat, m.location_lng) as dist
  FROM public.members m
  JOIN public.delivery_areas da ON da.id = zone_id
  WHERE m.owner_id = p_owner_id
    AND m.location_lat IS NOT NULL
    AND m.location_lng IS NOT NULL
    AND da.center_lat IS NOT NULL
    AND da.center_lng IS NOT NULL
    AND da.radius_km IS NOT NULL
    AND haversine_distance(da.center_lat, da.center_lng, m.location_lat, m.location_lng) <= da.radius_km
  ORDER BY dist;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION haversine_distance TO authenticated;
GRANT EXECUTE ON FUNCTION get_members_in_zone TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
