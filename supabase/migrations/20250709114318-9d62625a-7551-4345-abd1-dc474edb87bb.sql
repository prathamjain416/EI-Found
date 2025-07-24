-- Add the user's email to the allowlist so they can register
INSERT INTO public.email_allowlist (email) 
VALUES ('jainpratham468@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Also add a common test email pattern 
INSERT INTO public.email_allowlist (email) 
VALUES ('pratham@gmail.com')
ON CONFLICT (email) DO NOTHING;