# Authentication Tasks

## Completed

- [x] Create `Auth.tsx` page with sign-in/signup forms
- [x] Create `BuyerAuthModal.tsx` for buyer-specific auth
- [x] Set up Supabase client in `src/lib/supabase.ts`
- [x] Implement `useAuth` hook with session management
- [x] Add `ProtectedRoute` wrapper
- [x] Add role-based redirect logic
- [x] Fix translated role strings causing blank page on language switch
- [x] Fix auto-login on page load (SIGNED_OUT vs TOKEN_REFRESHED race)
- [x] Integrate Sentry + PostHog user identity
- [x] Add Cypher query for `captureError` on auth failures
