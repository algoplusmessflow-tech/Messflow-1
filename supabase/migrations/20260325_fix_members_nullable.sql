-- =====================================================
-- MESSFLOW — Fix Members Table Constraints
-- =====================================================

-- Make sales_person_id nullable so sales portal can add members
ALTER TABLE public.members ALTER COLUMN sales_person_id DROP NOT NULL;

-- If the above fails (constraint might be RESTRICT), drop and recreate
-- Step 1: Drop existing FK constraint
-- ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_sales_person_id_fkey;

-- Step 2: Recreate as nullable FK
-- ALTER TABLE public.members 
-- ADD CONSTRAINT members_sales_person_id_fkey 
-- FOREIGN KEY (sales_person_id) REFERENCES public.sales_persons(id) ON DELETE SET NULL;

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'members' AND column_name = 'sales_person_id';
