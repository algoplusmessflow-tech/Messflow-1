-- =====================================================
-- MESS FLOW - Phase 1 Foundation Migration
-- Version: 1.0 (March 2026)
-- Description: Adds sales person module, location fields, and slug support
-- =====================================================

-- =====================================================
-- PART 1: ADD sales_person TO app_role ENUM
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('super_admin', 'owner', 'sales_person');
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'sales_person' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
    ) THEN
      ALTER TYPE public.app_role ADD VALUE 'sales_person';
    END IF;
  END IF;
END
$$;

-- =====================================================
-- PART 2: ADD SLUG AND FEATURE FLAGS TO PROFILES
-- =====================================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_slug TEXT UNIQUE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS feature_white_ui BOOLEAN DEFAULT false;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS feature_slug_links BOOLEAN DEFAULT false;

-- Create index for slug lookup performance
CREATE INDEX IF NOT EXISTS idx_profiles_business_slug ON public.profiles(business_slug);

-- =====================================================
-- PART 3: ADD LOCATION FIELDS TO MEMBERS
-- =====================================================

ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION;

ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;

ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS map_link TEXT;

ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS delivery_area_id UUID REFERENCES public.delivery_areas(id) ON DELETE SET NULL;

ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS sales_person_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_members_location ON public.members(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_members_delivery_area ON public.members(delivery_area_id);
CREATE INDEX IF NOT EXISTS idx_members_sales_person ON public.members(sales_person_id);

-- =====================================================
-- PART 4: CREATE SALES_PERSONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sales_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  access_token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on sales_persons
ALTER TABLE public.sales_persons ENABLE ROW LEVEL SECURITY;

-- RLS policies for sales_persons
DROP POLICY IF EXISTS "Owners can view own sales persons" ON public.sales_persons;
CREATE POLICY "Owners can view own sales persons" 
ON public.sales_persons 
FOR SELECT 
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can create sales persons" ON public.sales_persons;
CREATE POLICY "Owners can create sales persons" 
ON public.sales_persons 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update own sales persons" ON public.sales_persons;
CREATE POLICY "Owners can update own sales persons" 
ON public.sales_persons 
FOR UPDATE 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete own sales persons" ON public.sales_persons;
CREATE POLICY "Owners can delete own sales persons" 
ON public.sales_persons 
FOR DELETE 
USING (owner_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_sales_persons_owner_id ON public.sales_persons(owner_id);
CREATE INDEX IF NOT EXISTS idx_sales_persons_access_token ON public.sales_persons(access_token);

-- =====================================================
-- PART 5: CREATE DELETION_REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_person_id UUID REFERENCES public.sales_persons(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on deletion_requests
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for deletion_requests
-- Owners can view all deletion requests for their members
DROP POLICY IF EXISTS "Owners can view deletion requests" ON public.deletion_requests;
CREATE POLICY "Owners can view deletion requests" 
ON public.deletion_requests 
FOR SELECT 
USING (owner_id = auth.uid());

-- Sales persons can create deletion requests for their added members
DROP POLICY IF EXISTS "Sales persons can create deletion requests" ON public.deletion_requests;
CREATE POLICY "Sales persons can create deletion requests" 
ON public.deletion_requests 
FOR INSERT 
WITH CHECK (
  sales_person_id IN (
    SELECT id FROM public.sales_persons 
    WHERE owner_id = auth.uid()
  )
);

-- Owners can update (approve/reject) deletion requests
DROP POLICY IF EXISTS "Owners can update deletion requests" ON public.deletion_requests;
CREATE POLICY "Owners can update deletion requests" 
ON public.deletion_requests 
FOR UPDATE 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete deletion requests" ON public.deletion_requests;
CREATE POLICY "Owners can delete deletion requests" 
ON public.deletion_requests 
FOR DELETE 
USING (owner_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_deletion_requests_owner_id ON public.deletion_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_sales_person ON public.deletion_requests(sales_person_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON public.deletion_requests(status);

-- =====================================================
-- PART 6: UPDATE MEMBERS RLS FOR SALES PERSON ACCESS
-- =====================================================

-- Sales persons can view members they added
DROP POLICY IF EXISTS "Sales persons can view their added members" ON public.members;
CREATE POLICY "Sales persons can view their added members" 
ON public.members 
FOR SELECT 
USING (
  owner_id IN (
    SELECT owner_id FROM public.sales_persons WHERE id = auth.uid()
  )
  OR sales_person_id = auth.uid()
  OR owner_id = auth.uid()
);

-- Sales persons can update members they added
DROP POLICY IF EXISTS "Sales persons can update their added members" ON public.members;
CREATE POLICY "Sales persons can update their added members" 
ON public.members 
FOR UPDATE 
USING (
  sales_person_id = auth.uid()
  OR owner_id = auth.uid()
)
WITH CHECK (
  sales_person_id = auth.uid()
  OR owner_id = auth.uid()
);

-- =====================================================
-- PART 7: CREATE FUNCTION TO GENERATE SLUG
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_business_slug(business_name TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT 
    LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          business_name,
          '[^a-zA-Z0-9\s-]',
          '',
          'g'
        ),
        '[\s-]+',
        '-',
        'g'
      )
    );
$$;

-- =====================================================
-- PART 8: CREATE FUNCTION TO ENSURE UNIQUE SLUG
-- =====================================================

CREATE OR REPLACE FUNCTION public.ensure_unique_slug(owner_id UUID, business_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  base_slug TEXT;
  slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := public.generate_business_slug(business_name);
  slug := base_slug;
  
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE business_slug = slug 
      AND user_id != owner_id
    ) THEN
      RETURN slug;
    END IF;
    
    counter := counter + 1;
    slug := base_slug || '-' || counter;
    
    IF counter > 100 THEN
      RAISE EXCEPTION 'Unable to generate unique slug';
    END IF;
  END LOOP;
END;
$$;

-- =====================================================
-- PART 9: UPDATE EXISTING PROFILES WITH SLUGS
-- =====================================================

-- This will be executed separately to avoid locking
-- UPDATE public.profiles 
-- SET business_slug = public.ensure_unique_slug(user_id, business_name)
-- WHERE business_slug IS NULL;

-- =====================================================
-- PART 10: HELPER VIEW FOR SALES PERSON CUSTOMERS
-- =====================================================

CREATE OR REPLACE VIEW public.sales_person_customers AS
SELECT 
  m.*,
  sp.name AS sales_person_name,
  sp.phone AS sales_person_phone
FROM public.members m
LEFT JOIN public.sales_persons sp ON m.sales_person_id = sp.id
WHERE m.sales_person_id IS NOT NULL;

-- Grant access to sales persons
GRANT SELECT ON public.sales_person_customers TO authenticated;
