-- Create the business type enum
CREATE TYPE business_type AS ENUM ('mess', 'restaurant', 'canteen', 'cloud_kitchen');

-- Add the column to profiles table with a default value of 'mess'
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS business_type business_type DEFAULT 'mess'::business_type;
