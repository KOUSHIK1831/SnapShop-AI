-- Update the order status change logger to also track pay_status changes
CREATE OR REPLACE FUNCTION public.log_order_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle Insert
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.order_tracking_logs (order_id, status, description)
    VALUES (NEW.id, NEW.status, 'Order placed via ' || NEW.pay_method);
    RETURN NEW;
  END IF;

  -- Handle status change
  IF (OLD.status IS NULL OR NEW.status <> OLD.status) THEN
    INSERT INTO public.order_tracking_logs (order_id, status, description)
    VALUES (NEW.id, NEW.status, 'Fulfillment status updated to ' || NEW.status);
  END IF;

  -- Handle pay_status change
  IF (OLD.pay_status IS NULL OR NEW.pay_status <> OLD.pay_status) THEN
    INSERT INTO public.order_tracking_logs (order_id, status, description)
    VALUES (NEW.id, NEW.pay_status, 'Payment status updated to ' || NEW.pay_status);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;

CREATE TRIGGER on_order_change
  AFTER INSERT OR UPDATE OF status, pay_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_changes();
