-- Add unit_price to orders for accurate historical analytics
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2) DEFAULT 0;

-- Update existing orders with current product price as a fallback
UPDATE public.orders o
SET unit_price = p.price
FROM public.products p
WHERE o.product_id = p.id AND o.unit_price = 0;
