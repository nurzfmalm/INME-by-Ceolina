-- Make artworks bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'artworks';

-- Drop the public view policy
DROP POLICY IF EXISTS "Anyone can view artworks" ON storage.objects;

-- Create policy for users to view own artworks
DROP POLICY IF EXISTS "Users can view own artworks" ON storage.objects;
CREATE POLICY "Users can view own artworks"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'artworks'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Keep the parent policy for viewing children's artworks (already exists)
-- The "Parents can view children artworks" policy should still work