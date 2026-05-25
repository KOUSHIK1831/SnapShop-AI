-- Create notification_logs table for reliability and monitoring
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'order' or 'seller'
  entity_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'sent', 'failed'
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  last_attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Only Admins can view notification logs
CREATE POLICY "Admins can view notification logs" 
ON public.notification_logs FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND role = 'admin'
));

-- Allow service role (Edge Functions) to insert/update logs
CREATE POLICY "Service role can manage notification logs"
ON public.notification_logs FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');
