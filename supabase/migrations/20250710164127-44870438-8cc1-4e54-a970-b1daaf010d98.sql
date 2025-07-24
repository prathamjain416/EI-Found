-- Clear existing user data
DELETE FROM public.profiles;
DELETE FROM auth.users;

-- Add new fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN class TEXT,
ADD COLUMN section TEXT,
ADD COLUMN batch TEXT,
ADD COLUMN hobby TEXT,
ADD COLUMN website TEXT,
ADD COLUMN social TEXT,
ADD COLUMN about TEXT;