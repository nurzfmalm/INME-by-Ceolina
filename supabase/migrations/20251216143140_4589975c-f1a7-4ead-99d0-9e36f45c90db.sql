-- Drop the insecure policy that exposes parent_user_id
DROP POLICY IF EXISTS "Anyone can view unused codes" ON public.parent_child_links;

-- Create a security definer function to validate access codes without exposing user IDs
CREATE OR REPLACE FUNCTION public.validate_access_code(code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_child_links
    WHERE access_code = code
      AND child_user_id IS NULL
  )
$$;

-- Create a security definer function to claim an access code (link child to parent)
CREATE OR REPLACE FUNCTION public.claim_access_code(code TEXT, child_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_id UUID;
BEGIN
  -- Find and update the link
  UPDATE public.parent_child_links
  SET child_user_id = child_id
  WHERE access_code = code
    AND child_user_id IS NULL
  RETURNING parent_user_id INTO parent_id;
  
  RETURN parent_id;
END;
$$;