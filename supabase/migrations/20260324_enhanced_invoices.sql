-- =====================================================
-- MESS MANAGER PRO - Enhanced Invoices Migration
-- Version: 1.1 (March 2026)
-- Description: Adds customer_id field and improves invoice tracking
-- =====================================================

-- Add customer_id field to track recurring customers
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS previous_invoice_id UUID REFERENCES public.invoices(id);

-- Add source column to distinguish auto-generated vs manual invoices
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Create index for customer phone lookup
CREATE INDEX IF NOT EXISTS idx_invoices_customer_phone ON public.invoices(customer_phone);
CREATE INDEX IF NOT EXISTS idx_invoices_is_recurring ON public.invoices(is_recurring);

-- Add comment for documentation
COMMENT ON COLUMN public.invoices.customer_phone IS 'Phone number of the customer for recurring invoice tracking';
COMMENT ON COLUMN public.invoices.is_recurring IS 'Whether this is a recurring invoice for returning customer';
COMMENT ON COLUMN public.invoices.previous_invoice_id IS 'Reference to previous invoice for recurring customers';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
