-- =====================================================
-- MESSFLOW — Check and Fix Sales Person Data
-- =====================================================

-- Step 1: Check if sales_persons table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'sales_persons';

-- Step 2: Check all records in sales_persons
SELECT * FROM public.sales_persons LIMIT 10;

-- Step 3: Check the foreign key constraint on members table
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'members';

-- Step 4: Check if there are any members with NULL sales_person_id allowed
SELECT COUNT(*) as null_sales_persons FROM public.members WHERE sales_person_id IS NULL;

-- Step 5: If the issue is FK constraint, make sales_person_id nullable
-- First check the current constraint
-- Then drop and recreate without NOT NULL if needed
ALTER TABLE public.members ALTER COLUMN sales_person_id DROP NOT NULL;

-- Step 6: Verify members table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'members' AND column_name = 'sales_person_id';

-- Step 7: Check for any data type mismatches
SELECT id, name, typeof(id) as id_type FROM public.sales_persons LIMIT 5;
