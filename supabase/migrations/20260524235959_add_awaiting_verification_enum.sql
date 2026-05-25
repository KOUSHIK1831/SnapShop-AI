-- Add 'awaiting_verification' to payment_status enum
-- This is in a separate file to avoid "unsafe use of new value" error in the same transaction.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'payment_status'::regtype 
        AND enumlabel = 'awaiting_verification'
    ) THEN
        ALTER TYPE payment_status ADD VALUE 'awaiting_verification';
    END IF;
END $$;
