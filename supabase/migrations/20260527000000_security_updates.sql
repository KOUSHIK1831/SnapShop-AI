-- Security Update: Fix RLS and prepare for Data API default changes (May/Oct 2026)
-- Target: Project ApnaBazar (pupjskrkmhzesjfltncb)

-- 1. Fix missing RLS on rate_limits (fixes rls_disabled_in_public vulnerability)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Add policy for service_role to manage rate limits (used by Edge Functions)
-- Note: check_rate_limit function uses SECURITY DEFINER, but explicit policy is best practice.
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;
CREATE POLICY "Service role can manage rate limits"
  ON public.rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Grant usage on public schema to standard roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 3. Restore default PostgREST access by granting standard permissions on all tables to authenticated users.
-- RLS policies will continue to enforce actual data access boundaries.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 4. Grant access to sequences (for auto-incrementing IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 5. Grant execution rights on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 6. Ensure anonymous users can still access public storefront data
-- Note: 'anon' only gets SELECT on these specific tables.
GRANT SELECT ON public.sellers TO anon;
GRANT SELECT ON public.products TO anon;

-- 7. Future-proofing: Set default privileges for tables/functions created in the future
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
