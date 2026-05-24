-- 1. Add verification fields to sellers
ALTER TABLE public.sellers 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS verification_documents TEXT[],
ADD COLUMN IF NOT EXISTS admin_feedback TEXT,
ADD COLUMN IF NOT EXISTS last_submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS gstin TEXT,
ADD COLUMN IF NOT EXISTS registered_business_name TEXT;

-- 2. Create private storage bucket for proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('seller-proofs', 'seller-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS for seller-proofs bucket
-- Remove existing policies if any to avoid conflicts during development
DROP POLICY IF EXISTS "Sellers can upload their own proofs" ON storage.objects;
DROP POLICY IF EXISTS "Sellers and Admins can view proofs" ON storage.objects;

-- Only the owner can upload
CREATE POLICY "Sellers can upload their own proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'seller-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Only the owner AND admins can read
CREATE POLICY "Sellers and Admins can view proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'seller-proofs' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
);
