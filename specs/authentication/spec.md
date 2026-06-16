# Authentication Feature Spec

## Overview

Users can sign up, sign in, and manage their session. Supports email/password and magic link authentication via Supabase. Role-based routing directs users to seller, buyer, or admin dashboards.

## Routes

- `/auth` — Login / signup page
- `/reset-password` — Password reset flow

## States

- **Loading**: Shows spinner while checking auth state
- **Authenticated**: Redirects to role-specific dashboard
- **Unauthenticated**: Shows auth page with sign-in/signup forms
- **Error**: Displays inline error messages for invalid credentials, expired links, etc.

## Edge Cases

- OTP type recovery redirects to `/reset-password`
- `SIGNED_OUT` event must clear user state immediately (prevent `TOKEN_REFRESHED` race condition)
- Session from URL hash fragments (Supabase magic link callback)
- Language switch must not translate role strings (`seller`/`buyer`/`admin`) or route paths
