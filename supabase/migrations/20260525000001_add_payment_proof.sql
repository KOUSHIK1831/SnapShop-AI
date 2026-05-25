-- Add payment_proof_url to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Update RLS policies to allow buyers to upload to a specific bucket if needed
-- Assuming we use the existing 'product-images' or create a new 'order-proofs' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-proofs', 'order-proofs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload order proofs" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'order-proofs');

CREATE POLICY "Anyone can view order proofs" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'order-proofs');
