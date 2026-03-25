-- =====================================================
-- INVOICES — COMPLETE SETUP (create if missing + fix)
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create invoices table if it doesn't exist
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

-- Create invoice_items table if it doesn't exist
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

-- Add extended columns
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS previous_invoice_id UUID;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_owner_id ON public.invoices(owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_member_id ON public.invoices(member_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DO $x$ BEGIN
  DROP POLICY IF EXISTS "inv_select" ON public.invoices;
  DROP POLICY IF EXISTS "inv_insert" ON public.invoices;
  DROP POLICY IF EXISTS "inv_update" ON public.invoices;
  DROP POLICY IF EXISTS "inv_delete" ON public.invoices;
  DROP POLICY IF EXISTS "Owners can only view own invoices" ON public.invoices;
  DROP POLICY IF EXISTS "Owners can only create own invoices" ON public.invoices;
  DROP POLICY IF EXISTS "Owners can only update own invoices" ON public.invoices;
  DROP POLICY IF EXISTS "Owners can only delete own invoices" ON public.invoices;
EXCEPTION WHEN undefined_object THEN NULL;
END $x$;

CREATE POLICY "inv_select" ON public.invoices FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "inv_insert" ON public.invoices FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "inv_update" ON public.invoices FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "inv_delete" ON public.invoices FOR DELETE USING (owner_id = auth.uid());
GRANT ALL ON public.invoices TO authenticated;

-- RLS for invoice_items
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
DO $x$ BEGIN
  DROP POLICY IF EXISTS "inv_items_select" ON public.invoice_items;
  DROP POLICY IF EXISTS "inv_items_insert" ON public.invoice_items;
  DROP POLICY IF EXISTS "inv_items_update" ON public.invoice_items;
  DROP POLICY IF EXISTS "inv_items_delete" ON public.invoice_items;
  DROP POLICY IF EXISTS "Owners can only view own invoice items" ON public.invoice_items;
  DROP POLICY IF EXISTS "Owners can only create own invoice items" ON public.invoice_items;
  DROP POLICY IF EXISTS "Owners can only update own invoice items" ON public.invoice_items;
  DROP POLICY IF EXISTS "Owners can only delete own invoice items" ON public.invoice_items;
EXCEPTION WHEN undefined_object THEN NULL;
END $x$;

CREATE POLICY "inv_items_select" ON public.invoice_items FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "inv_items_insert" ON public.invoice_items FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "inv_items_update" ON public.invoice_items FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "inv_items_delete" ON public.invoice_items FOR DELETE USING (owner_id = auth.uid());
GRANT ALL ON public.invoice_items TO authenticated;

-- Also add next_invoice_number to profiles if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS next_invoice_number INTEGER DEFAULT 1;

-- Verify
SELECT 'invoices' as tbl, count(*) FROM public.invoices
UNION ALL
SELECT 'invoice_items', count(*) FROM public.invoice_items;


-- =====================================================
-- INVENTORY ANON ACCESS (for Kitchen Portal)
-- =====================================================
DO $x$ BEGIN
  CREATE POLICY "inventory_anon_read" ON public.inventory FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $x$;
DO $x$ BEGIN
  EXECUTE 'GRANT SELECT ON public.inventory TO anon';
EXCEPTION WHEN undefined_table THEN NULL;
END $x$;

-- Inventory consumption insert for kitchen portal
DO $x$ BEGIN
  CREATE POLICY "inventory_consumption_anon_insert" ON public.inventory_consumption FOR INSERT TO anon WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $x$;
DO $x$ BEGIN
  EXECUTE 'GRANT INSERT ON public.inventory_consumption TO anon';
EXCEPTION WHEN undefined_table THEN NULL;
END $x$;