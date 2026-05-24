-- Add size_variants to products for multi-size stock management
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size_variants jsonb DEFAULT '[]'::jsonb;

-- Add selected_size to orders to record which size was bought
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS selected_size TEXT;
