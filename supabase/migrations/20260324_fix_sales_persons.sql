-- =====================================================
-- MESS MANAGER PRO - Fix Sales Persons Constraints
-- Version: 1.0 (March 24, 2026)
-- Description: Ensures proper constraints and indexes for sales_persons table
-- =====================================================

-- Ensure access_token is unique (should already exist from migration)
-- This prevents duplicate tokens which could cause insert failures
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_persons_access_token_unique 
ON public.sales_persons(access_token);

-- Add check constraint to ensure name is not empty
ALTER TABLE public.sales_persons 
DROP CONSTRAINT IF EXISTS sales_persons_name_check;

ALTER TABLE public.sales_persons 
ADD CONSTRAINT sales_persons_name_check 
CHECK (LENGTH(TRIM(name)) > 0);

-- Add check constraint to ensure phone format if provided (optional field)
ALTER TABLE public.sales_persons 
DROP CONSTRAINT IF EXISTS sales_persons_phone_format;

-- Note: Phone format validation is done in application layer for flexibility

-- Add check constraint to ensure email format if provided (optional field)
ALTER TABLE public.sales_persons 
DROP CONSTRAINT IF EXISTS sales_persons_email_format;

-- Note: Email format validation is done in application layer for flexibility

-- Ensure is_active defaults to true
ALTER TABLE public.sales_persons 
ALTER COLUMN is_active SET DEFAULT true;

-- Update any existing NULL is_active values to true
UPDATE public.sales_persons 
SET is_active = true 
WHERE is_active IS NULL;

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_sales_persons_created_at 
ON public.sales_persons(created_at DESC);

-- Create index on owner_id for filtering
CREATE INDEX IF NOT EXISTS idx_sales_persons_owner_id_lookup 
ON public.sales_persons(owner_id);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
