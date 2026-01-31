-- Allow reading children by access_code (for login validation)
CREATE POLICY "Anyone can read children by access_code" 
ON public.children 
FOR SELECT 
USING (access_code IS NOT NULL);