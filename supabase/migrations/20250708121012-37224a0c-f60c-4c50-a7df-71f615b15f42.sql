-- Add unique constraint on user_id to prevent duplicate profiles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Remove profiles for unauthorized emails (keeping only authorized ones)
DELETE FROM public.profiles 
WHERE user_id IN (
  SELECT u.id 
  FROM auth.users u 
  WHERE u.email NOT IN ('jainpratham468@gmail.com', 'abcfriphone@gmail.com', 'prathamjain416416@gmail.com')
);

-- Also need to clean up messages from unauthorized users
DELETE FROM public.messages 
WHERE user_id IN (
  SELECT u.id 
  FROM auth.users u 
  WHERE u.email NOT IN ('jainpratham468@gmail.com', 'abcfriphone@gmail.com', 'prathamjain416416@gmail.com')
);