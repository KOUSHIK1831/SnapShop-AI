-- 1. Ensure buckets exist and are public
-- making seller-proofs public allows getPublicUrl to work for both sellers and admins
INSERT INTO storage.buckets (id, name, public) 
VALUES ('seller-proofs', 'seller-proofs', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Ensure uploads is also public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 2. Update Storage RLS policies for seller-proofs
-- We use public.is_admin() helper to avoid recursion and ensure reliable access
DROP POLICY IF EXISTS "Sellers and Admins can view proofs" ON storage.objects;
CREATE POLICY "Sellers and Admins can view proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'seller-proofs' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    public.is_admin(auth.uid())
  )
);

-- 3. Ensure anyone can view public objects in these buckets
-- This is necessary since we made them public and want getPublicUrl to work
DROP POLICY IF EXISTS "Public Access to Proofs" ON storage.objects;
CREATE POLICY "Public Access to Proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'seller-proofs');

DROP POLICY IF EXISTS "Public Access to Uploads" ON storage.objects;
CREATE POLICY "Public Access to Uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads');
