-- Allow anonymous users to check unused access codes
CREATE POLICY "Anyone can view unused codes"
ON public.parent_child_links
FOR SELECT
TO anon
USING (child_user_id IS NULL);