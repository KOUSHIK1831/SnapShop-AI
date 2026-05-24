-- Add payment configuration columns to sellers table
ALTER TABLE public.sellers 
ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT DEFAULT 'both' CHECK (preferred_payment_method IN ('upi', 'razorpay', 'both')),
ADD COLUMN IF NOT EXISTS seller_upi_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_account_id TEXT;

-- Update orders table to handle more granular statuses
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_pay_status_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_pay_status_check 
CHECK (pay_status IN ('pending', 'paid', 'failed', 'refunded', 'awaiting_verification'));
