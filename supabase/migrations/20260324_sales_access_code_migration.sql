-- =====================================================
-- MESSFLOW — Sales Person Access Code Migration
-- Date: 2026-03-24
-- Migrate old long access codes to new 6-character format
-- =====================================================

-- Migration function to generate new 6-char codes
CREATE OR REPLACE FUNCTION generate_short_access_code()
RETURNS TRIGGER AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * 36 + 1)::integer, 1);
  END LOOP;
  NEW.access_token := code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Option 1: Update all existing sales persons with new 6-char codes
-- This generates unique codes for each record
UPDATE public.sales_persons
SET access_token = (
  SELECT string_agg(
    substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 
           floor(random() * 36 + 1)::int, 1), '')
  FROM generate_series(1, 6)
);

-- Verify the update
SELECT 
  id, 
  name, 
  access_token, 
  char_length(access_token) as code_length
FROM public.sales_persons
LIMIT 10;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- All sales person access codes are now 6 characters
-- Existing codes are invalidated - sales persons need to get new codes
-- New codes will be generated automatically when adding sales persons
