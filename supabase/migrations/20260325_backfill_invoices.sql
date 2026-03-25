-- =====================================================
-- BACKFILL: Generate invoices for existing paid members
-- Run AFTER the invoices table has been created
-- =====================================================

-- Insert invoices for paid members who don't have one yet
INSERT INTO public.invoices (
  owner_id, invoice_number, member_id, customer_phone,
  billing_period_start, billing_period_end,
  subtotal, tax_rate, tax_amount, total_amount,
  notes, status, due_date, paid_date, source, created_at
)
SELECT 
  m.owner_id,
  'INV-' || LPAD((ROW_NUMBER() OVER (PARTITION BY m.owner_id ORDER BY m.joining_date, m.created_at))::TEXT, 5, '0'),
  m.id,
  m.phone,
  COALESCE(m.joining_date::DATE, m.created_at::DATE),
  COALESCE(m.plan_expiry_date::DATE, (m.joining_date::DATE + INTERVAL '1 month')::DATE),
  ROUND(m.monthly_fee / 1.05, 2),   -- subtotal (assuming 5% VAT)
  5,                                   -- tax_rate
  ROUND(m.monthly_fee - (m.monthly_fee / 1.05), 2), -- tax_amount
  m.monthly_fee,                       -- total_amount (inclusive)
  'Auto-generated from existing member data for ' || m.name,
  CASE WHEN m.balance <= 0 THEN 'paid' ELSE 'sent' END,
  COALESCE(m.plan_expiry_date::DATE, (m.joining_date::DATE + INTERVAL '1 month')::DATE),
  CASE WHEN m.balance <= 0 THEN COALESCE(m.joining_date::DATE, m.created_at::DATE) ELSE NULL END,
  'member_signup',
  COALESCE(m.joining_date, m.created_at)
FROM public.members m
WHERE m.status = 'active'
  AND m.monthly_fee > 0
  AND NOT m.free_trial
  AND NOT EXISTS (
    SELECT 1 FROM public.invoices inv WHERE inv.member_id = m.id
  );

-- Create corresponding invoice_items
INSERT INTO public.invoice_items (
  owner_id, invoice_id, description, quantity, unit_price, total_price
)
SELECT 
  inv.owner_id,
  inv.id,
  'Meal subscription — ' || m.name,
  1,
  inv.subtotal,
  inv.subtotal
FROM public.invoices inv
JOIN public.members m ON m.id = inv.member_id
WHERE inv.source = 'member_signup'
  AND NOT EXISTS (
    SELECT 1 FROM public.invoice_items ii WHERE ii.invoice_id = inv.id
  );

-- Update the next_invoice_number in profiles to avoid conflicts
UPDATE public.profiles p
SET next_invoice_number = COALESCE(
  (SELECT COUNT(*) + 1 FROM public.invoices WHERE owner_id = p.user_id),
  1
);

-- Verify
SELECT 'Invoices created' as info, count(*) FROM public.invoices
UNION ALL
SELECT 'Invoice items created', count(*) FROM public.invoice_items;
