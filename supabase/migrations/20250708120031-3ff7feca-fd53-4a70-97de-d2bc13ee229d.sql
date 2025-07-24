-- Add new email to allowlist
INSERT INTO public.email_allowlist (email) VALUES 
('prathamjain416416@gmail.com');

-- Ensure jainpratham468@gmail.com has admin status
UPDATE public.profiles 
SET is_admin = true 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'jainpratham468@gmail.com'
);