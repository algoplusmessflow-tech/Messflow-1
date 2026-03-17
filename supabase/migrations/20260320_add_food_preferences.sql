-- Add food-related columns to members table
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS meal_type TEXT DEFAULT 'both',
ADD COLUMN IF NOT EXISTS roti_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rice_type TEXT DEFAULT 'white_rice',
ADD COLUMN IF NOT EXISTS dietary_preference TEXT DEFAULT 'non_veg',
ADD COLUMN IF NOT EXISTS special_notes TEXT,
ADD COLUMN IF NOT EXISTS pause_service BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS skip_weekends BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS free_trial BOOLEAN DEFAULT false;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_members_meal_type ON public.members(meal_type);
CREATE INDEX IF NOT EXISTS idx_members_dietary ON public.members(dietary_preference);
CREATE INDEX IF NOT EXISTS idx_members_delivery_area_new ON public.members(delivery_area_id);
