-- Simple Rate Limiting Table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  last_request_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_limit RECORD;
BEGIN
  -- Clean up expired limits
  DELETE FROM public.rate_limits WHERE reset_at < v_now;

  SELECT * INTO v_limit FROM public.rate_limits WHERE key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (key, count, reset_at)
    VALUES (p_key, 1, v_now + (p_window_seconds || ' seconds')::INTERVAL);
    RETURN TRUE;
  END IF;

  IF v_limit.count >= p_max_requests THEN
    RETURN FALSE;
  END IF;

  UPDATE public.rate_limits 
  SET count = count + 1, last_request_at = v_now
  WHERE key = p_key;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
