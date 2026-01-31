-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can read children by access_code" ON public.children;

-- The validate_child_access_code function already uses SECURITY DEFINER
-- so it can bypass RLS. No additional policy needed for login flow.