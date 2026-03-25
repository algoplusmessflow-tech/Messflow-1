-- =====================================================
-- INVOICES FIX — Run this in Supabase SQL Editor
-- Ensures invoices table exists, has all columns, and RLS works
-- =====================================================

-- Add missing columns if they don't exist
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Ensure RLS is enabled
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to be safe
DO $x$ BEGIN
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

-- Same for invoice_items
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DO $x$ BEGIN
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

-- Verify
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('invoices', 'invoice_items')
ORDER BY tablename, cmd;
