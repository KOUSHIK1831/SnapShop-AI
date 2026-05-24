-- ==========================================
-- MASTER MIGRATION: ORDER TRACKING & PAYMENTS
-- ==========================================

-- 1. Create Enums for Delivery and Payments
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_type') THEN
        CREATE TYPE delivery_type AS ENUM ('courier', 'self_delivery');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('cod', 'online');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
    END IF;
END $$;

-- 2. Update Orders Table with New Columns
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS del_type delivery_type DEFAULT 'courier',
ADD COLUMN IF NOT EXISTS tracking_provider TEXT,
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS delivery_person_name TEXT,
ADD COLUMN IF NOT EXISTS delivery_person_phone TEXT,
ADD COLUMN IF NOT EXISTS pay_method payment_method DEFAULT 'cod',
ADD COLUMN IF NOT EXISTS pay_status payment_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT;

-- 3. Update Status Constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'accepted', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled'));

-- 4. Create Order Tracking Logs Table
CREATE TABLE IF NOT EXISTS public.order_tracking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL,
  description TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. Enable RLS on Tracking Logs
ALTER TABLE public.order_tracking_logs ENABLE ROW LEVEL SECURITY;

-- 6. Tracking Logs Policies
DROP POLICY IF EXISTS "Sellers can view tracking logs for their orders" ON public.order_tracking_logs;
CREATE POLICY "Sellers can view tracking logs for their orders"
  ON public.order_tracking_logs FOR SELECT
  USING (order_id IN (
    SELECT id FROM public.orders WHERE seller_id IN (
      SELECT id FROM public.sellers WHERE user_id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "Buyers can view tracking logs for their own orders" ON public.order_tracking_logs;
CREATE POLICY "Buyers can view tracking logs for their own orders"
  ON public.order_tracking_logs FOR SELECT
  USING (order_id IN (
    SELECT id FROM public.orders WHERE buyer_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Sellers can insert tracking logs" ON public.order_tracking_logs;
CREATE POLICY "Sellers can insert tracking logs"
  ON public.order_tracking_logs FOR INSERT
  WITH CHECK (order_id IN (
    SELECT id FROM public.orders WHERE seller_id IN (
      SELECT id FROM public.sellers WHERE user_id = auth.uid()
    )
  ));

-- 7. Automatic Logging Triggers
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.order_tracking_logs (order_id, status, description)
    VALUES (NEW.id, NEW.status, 'Order placed');
  ELSIF (TG_OP = 'UPDATE' AND (OLD.status IS NULL OR NEW.status <> OLD.status)) THEN
    INSERT INTO public.order_tracking_logs (order_id, status, description)
    VALUES (NEW.id, NEW.status, 'Order status updated to ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_status_change();

-- 8. Ensure Profiles Policy for OTP signup
DROP POLICY IF EXISTS "user_insert_own_profile" ON public.profiles;
CREATE POLICY "user_insert_own_profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
