-- Add trigger for profile changes (role, is_blocked)
CREATE OR REPLACE FUNCTION public.log_profile_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.role <> NEW.role OR OLD.is_blocked <> NEW.is_blocked) THEN
    INSERT INTO public.system_audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      old_data,
      new_data
    ) VALUES (
      auth.uid(),
      'profile_update',
      'profile',
      NEW.id::text,
      jsonb_build_object('role', OLD.role, 'is_blocked', OLD.is_blocked),
      jsonb_build_object('role', NEW.role, 'is_blocked', NEW.is_blocked)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_change
  AFTER UPDATE OF role, is_blocked ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_change();
