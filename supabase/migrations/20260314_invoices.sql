-- =====================================================
-- MESS MANAGER PRO - Invoices Migration
-- Version: 1.0 (March 2026)
-- Description: Adds invoices and invoice_items tables
-- =====================================================

-- =====================================================
-- PART 1: INVOICES TABLE
-- =====================================================

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  billing_period_start DATE,
  billing_period_end DATE,
  status TEXT DEFAULT 'draft',
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  due_date DATE,
  paid_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoices
CREATE POLICY "Owners can only view own invoices" 
ON public.invoices 
FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "Owners can only create own invoices" 
ON public.invoices 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can only update own invoices" 
ON public.invoices 
FOR UPDATE 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can only delete own invoices" 
ON public.invoices 
FOR DELETE 
USING (owner_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_invoices_owner_id ON public.invoices(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_member_id ON public.invoices(member_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);

-- =====================================================
-- PART 2: INVOICE ITEMS TABLE
-- =====================================================

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on invoice_items
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoice_items
CREATE POLICY "Owners can only view own invoice items" 
ON public.invoice_items 
FOR SELECT 
USING (owner_id = auth.uid());

CREATE POLICY "Owners can only create own invoice items" 
ON public.invoice_items 
FOR INSERT 
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can only update own invoice items" 
ON public.invoice_items 
FOR UPDATE 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can only delete own invoice items" 
ON public.invoice_items 
FOR DELETE 
USING (owner_id = auth.uid());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_invoice_items_owner_id ON public.invoice_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
