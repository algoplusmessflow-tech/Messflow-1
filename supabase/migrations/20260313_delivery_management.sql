-- =====================================================
-- MESS MANAGER PRO - Delivery Management Migration
-- Version: 1.0 (March 2026)
-- Description: Adds delivery management system
-- =====================================================

-- =====================================================
-- PART 1: DELIVERY AREAS TABLE
-- =====================================================

-- Create delivery_areas table
CREATE TABLE IF NOT EXISTS public.delivery_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on delivery_areas
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;

-- RLS policies for delivery_areas
CREATE POLICY "Owners can only view own delivery areas" 
ON public.delivery_areas 
FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "Owners can only create own delivery areas" 
ON public.delivery_areas 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can only update own delivery areas" 
ON public.delivery_areas 
FOR UPDATE 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can only delete own delivery areas" 
ON public.delivery_areas 
FOR DELETE 
USING (owner_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_delivery_areas_owner_id ON public.delivery_areas(owner_id);

-- =====================================================
-- PART 2: DRIVERS TABLE
-- =====================================================

-- Create drivers table
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  access_code TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on drivers
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- RLS policies for drivers
CREATE POLICY "Owners can only view own drivers" 
ON public.drivers 
FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "Owners can only create own drivers" 
ON public.drivers 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can only update own drivers" 
ON public.drivers 
FOR UPDATE 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can only delete own drivers" 
ON public.drivers 
FOR DELETE 
USING (owner_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_drivers_owner_id ON public.drivers(owner_id);

-- =====================================================
-- PART 3: DELIVERY BATCHES TABLE
-- =====================================================

-- Create delivery_batches table
CREATE TABLE IF NOT EXISTS public.delivery_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  area_id UUID REFERENCES delivery_areas(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on delivery_batches
ALTER TABLE public.delivery_batches ENABLE ROW LEVEL SECURITY;

-- RLS policies for delivery_batches
CREATE POLICY "Owners can only view own delivery batches" 
ON public.delivery_batches 
FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "Owners can only create own delivery batches" 
ON public.delivery_batches 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can only update own delivery batches" 
ON public.delivery_batches 
FOR UPDATE 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can only delete own delivery batches" 
ON public.delivery_batches 
FOR DELETE 
USING (owner_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_delivery_batches_owner_id ON public.delivery_batches(owner_id);
CREATE INDEX IF NOT EXISTS idx_delivery_batches_date ON public.delivery_batches(date);
CREATE INDEX IF NOT EXISTS idx_delivery_batches_area_id ON public.delivery_batches(area_id);
CREATE INDEX IF NOT EXISTS idx_delivery_batches_driver_id ON public.delivery_batches(driver_id);

-- =====================================================
-- PART 4: BATCH DELIVERIES TABLE
-- =====================================================

-- Create batch_deliveries table
CREATE TABLE IF NOT EXISTS public.batch_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES delivery_batches(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  delivery_time TIMESTAMPTZ,
  proof_url TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on batch_deliveries
ALTER TABLE public.batch_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS policies for batch_deliveries
CREATE POLICY "Owners can only view own batch deliveries" 
ON public.batch_deliveries 
FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "Owners can only create own batch deliveries" 
ON public.batch_deliveries 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can only update own batch deliveries" 
ON public.batch_deliveries 
FOR UPDATE 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can only delete own batch deliveries" 
ON public.batch_deliveries 
FOR DELETE 
USING (owner_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_batch_deliveries_owner_id ON public.batch_deliveries(owner_id);
CREATE INDEX IF NOT EXISTS idx_batch_deliveries_batch_id ON public.batch_deliveries(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_deliveries_member_id ON public.batch_deliveries(member_id);
CREATE INDEX IF NOT EXISTS idx_batch_deliveries_status ON public.batch_deliveries(status);

-- =====================================================
-- PART 5: DELIVERY STATUS LOGS TABLE
-- =====================================================

-- Create delivery_status_logs table
CREATE TABLE IF NOT EXISTS public.delivery_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_delivery_id UUID REFERENCES batch_deliveries(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on delivery_status_logs
ALTER TABLE public.delivery_status_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for delivery_status_logs
CREATE POLICY "Owners can only view own delivery status logs" 
ON public.delivery_status_logs 
FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "Owners can only create own delivery status logs" 
ON public.delivery_status_logs 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can only update own delivery status logs" 
ON public.delivery_status_logs 
FOR UPDATE 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can only delete own delivery status logs" 
ON public.delivery_status_logs 
FOR DELETE 
USING (owner_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_delivery_status_logs_owner_id ON public.delivery_status_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status_logs_batch_delivery_id ON public.delivery_status_logs(batch_delivery_id);

-- =====================================================
-- PART 6: INVOICE SETTINGS TABLE
-- =====================================================

-- Create invoice_settings table
CREATE TABLE IF NOT EXISTS public.invoice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_prefix TEXT DEFAULT 'INV',
  next_invoice_number INTEGER DEFAULT 1,
  tax_name TEXT DEFAULT 'VAT',
  tax_rate DECIMAL DEFAULT 5.0,
  company_address TEXT,
  company_logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on invoice_settings
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoice_settings
CREATE POLICY "Owners can only view own invoice settings" 
ON public.invoice_settings 
FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "Owners can only create own invoice settings" 
ON public.invoice_settings 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can only update own invoice settings" 
ON public.invoice_settings 
FOR UPDATE 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can only delete own invoice settings" 
ON public.invoice_settings 
FOR DELETE 
USING (owner_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_invoice_settings_owner_id ON public.invoice_settings(owner_id);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Run this migration in Supabase SQL Editor
-- Then proceed with TypeScript security fixes