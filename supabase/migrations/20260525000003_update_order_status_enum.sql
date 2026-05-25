-- Add preparing and ready_for_dispatch to order status lifecycle
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
CHECK (status IN ('pending', 'accepted', 'confirmed', 'preparing', 'ready_for_dispatch', 'shipped', 'out_for_delivery', 'delivered', 'completed', 'cancelled'));
