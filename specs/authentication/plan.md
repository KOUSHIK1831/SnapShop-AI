# Authentication Implementation Plan

## Phase 1: Auth UI

- [x] Sign-in form with email/password
- [x] Sign-up form with email/password
- [x] Magic link option
- [x] Password reset page
- [x] Language switcher support

## Phase 2: Session Management

- [x] Supabase `onAuthStateChange` listener
- [x] Role extraction from user metadata
- [x] Auto-redirect based on role
- [x] Sign-out with `{ scope: 'global' }` and localStorage cleanup

## Phase 3: Protection & Routing

- [x] `ProtectedRoute` component
- [x] Role-based route gating
- [x] Redirect to `/auth` when unauthenticated

## Phase 4: Observability

- [x] Sentry user context on login
- [x] PostHog identify on login
- [x] Error capture for auth failures
