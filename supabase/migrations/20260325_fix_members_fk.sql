-- =====================================================
-- MESSFLOW — Fix Members FK and Sales Person IDs
-- =====================================================

-- Step 1: Check current state of sales_persons table
SELECT id, name, owner_id, is_active 
FROM public.sales_persons;

-- Step 2: Check members table for any invalid foreign keys
SELECT m.id, m.name, m.sales_person_id, sp.id as sp_exists
FROM public.members m
LEFT JOIN public.sales_persons sp ON m.sales_person_id = sp.id
WHERE m.sales_person_id IS NOT NULL AND sp.id IS NULL;

-- Step 3: Check for NULL sales_person_id in members (this is usually allowed)
SELECT COUNT(*) as null_count FROM public.members WHERE sales_person_id IS NULL;

-- Step 4: Check the actual foreign key constraint definition
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.members'::regclass 
AND contype = 'f';

-- Step 5: Check if there are any orphaned records (members pointing to non-existent sales persons)
SELECT m.* 
FROM public.members m 
WHERE m.sales_person_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM public.sales_persons sp WHERE sp.id = m.sales_person_id);

-- Step 6: For any orphaned records, set sales_person_id to NULL (or update to a valid sales person)
-- Uncomment and run if needed:
-- UPDATE public.members SET sales_person_id = NULL WHERE sales_person_id IS NOT NULL 
-- AND NOT EXISTS (SELECT 1 FROM public.sales_persons WHERE id = members.sales_person_id);

-- Step 7: If the sales_persons table has no records, create a test one
-- Uncomment if needed:
-- INSERT INTO public.sales_persons (name, owner_id, access_token, is_active) 
-- VALUES ('Test Sales', (SELECT id FROM public.profiles LIMIT 1), 'TEST01', true);
