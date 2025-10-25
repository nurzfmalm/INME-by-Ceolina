-- Add interests field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.interests IS 'Child interests/hobbies as an array of strings';