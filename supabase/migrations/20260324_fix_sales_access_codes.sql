-- =====================================================
-- MESSFLOW — Sales Person Access Code Fix
-- Date: 2026-03-24
-- Fix: Regenerate all access codes as 6-char uppercase
-- =====================================================

-- Step 1: Update all sales_persons with new 6-character alphanumeric codes
UPDATE public.sales_persons
SET 
  access_token = (
    SELECT string_agg(
      substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 
             floor(random() * 36 + 1)::int, 1), '')
    FROM generate_series(1, 6)
  ),
  updated_at = NOW()
WHERE access_token IS NULL 
   OR length(access_token) > 6
   OR access_token = '';

-- Step 2: Verify the update
SELECT 
  id, 
  name, 
  access_token, 
  char_length(access_token) as code_length,
  is_active
FROM public.sales_persons
ORDER BY created_at DESC;

-- Step 3: Check if there are any NULL or empty tokens remaining
SELECT COUNT(*) as invalid_tokens
FROM public.sales_persons
WHERE access_token IS NULL OR access_token = '';
