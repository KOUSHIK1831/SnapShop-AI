-- Secure the seller-proofs bucket by making it private and removing public access
-- This ensures that sensitive documents are only accessible to the owner and admins

-- 1. Make the bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'seller-proofs';

-- 2. Remove the dangerous public access policy
DROP POLICY IF EXISTS "Public Access to Proofs" ON storage.objects;

-- 3. Ensure the restricted access policy is in place (re-creating it for clarity)
DROP POLICY IF EXISTS "Sellers and Admins can view proofs" ON storage.objects;
CREATE POLICY "Sellers and Admins can view proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'seller-proofs' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    public.is_admin(auth.uid())
  )
);

-- 4. Ensure sellers can still upload their own proofs
DROP POLICY IF EXISTS "Sellers can upload their own proofs" ON storage.objects;
CREATE POLICY "Sellers can upload their own proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'seller-proofs' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);
