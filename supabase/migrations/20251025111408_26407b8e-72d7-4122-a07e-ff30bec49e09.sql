-- Create role enum
CREATE TYPE public.app_role AS ENUM ('parent', 'child');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create parent-child relationships table
CREATE TABLE public.parent_child_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  child_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  access_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (parent_user_id, child_user_id)
);

-- Enable RLS
ALTER TABLE public.parent_child_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for parent_child_links
CREATE POLICY "Parents can view their links"
ON public.parent_child_links
FOR SELECT
TO authenticated
USING (auth.uid() = parent_user_id OR auth.uid() = child_user_id);

CREATE POLICY "Parents can create links"
ON public.parent_child_links
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = parent_user_id AND public.has_role(auth.uid(), 'parent'));

CREATE POLICY "Parents can delete their links"
ON public.parent_child_links
FOR DELETE
TO authenticated
USING (auth.uid() = parent_user_id);

-- Add parent_user_id to profiles table
ALTER TABLE public.profiles
ADD COLUMN parent_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Function to generate access code
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := UPPER(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.parent_child_links WHERE access_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$;