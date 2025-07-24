-- Add separate social media columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN instagram TEXT,
ADD COLUMN linkedin TEXT,
ADD COLUMN twitter TEXT;

-- Update existing social data to twitter field (if any exists)
UPDATE public.profiles 
SET twitter = social 
WHERE social IS NOT NULL AND social != '';

-- Remove the old social column
ALTER TABLE public.profiles DROP COLUMN social;