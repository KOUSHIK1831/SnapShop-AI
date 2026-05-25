-- Create system_audit_logs table
CREATE TABLE IF NOT EXISTS public.system_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only Admins can view audit logs
CREATE POLICY "Admins can view all audit logs" 
ON public.system_audit_logs FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

-- Function to log seller verification changes
CREATE OR REPLACE FUNCTION public.log_seller_verification_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.verification_status IS NULL OR NEW.verification_status <> OLD.verification_status) THEN
    INSERT INTO public.system_audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      old_data,
      new_data
    ) VALUES (
      auth.uid(),
      'seller_verification_update',
      'seller',
      NEW.id::text,
      jsonb_build_object('verification_status', OLD.verification_status),
      jsonb_build_object('verification_status', NEW.verification_status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for seller verification
CREATE TRIGGER on_seller_verification_change
  AFTER UPDATE OF verification_status ON public.sellers
  FOR EACH ROW
  EXECUTE FUNCTION public.log_seller_verification_change();
