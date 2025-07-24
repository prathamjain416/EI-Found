
-- Create allowlist table for email restrictions
CREATE TABLE public.email_allowlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_allowlist ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage allowlist
CREATE POLICY "Admins can manage allowlist" 
ON public.email_allowlist 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- Insert allowed emails
INSERT INTO public.email_allowlist (email) VALUES 
('abcfriphone@gmail.com');

-- Set admin status for the specified email
-- First, we need to update any existing profile for jainpratham468@gmail.com
UPDATE public.profiles 
SET is_admin = true 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'jainpratham468@gmail.com'
);

-- Create function to check if email is in allowlist
CREATE OR REPLACE FUNCTION public.is_email_allowed(email_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.email_allowlist 
    WHERE email = email_to_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
