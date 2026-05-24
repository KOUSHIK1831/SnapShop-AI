-- Add AI daily limit to sellers table
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS ai_daily_limit INTEGER DEFAULT 25;

-- Comment on column for clarity
COMMENT ON COLUMN public.sellers.ai_daily_limit IS 'The number of AI digitization requests a seller can perform per day.';
