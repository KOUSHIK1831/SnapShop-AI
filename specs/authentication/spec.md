# Authentication feature specification

## Scope

Users can create an account, sign in, verify their email, recover their password, and manage their session. Roles are administrator, seller, buyer, and volunteer.

## Routes

- `/auth` — sign-in and account creation
- `/reset-password` — password reset using a one-time API token
- `/onboarding` — seller or buyer role setup when required

## Requirements

- Email and password registration and sign-in
- Optional Google sign-in
- Short-lived access tokens and rotating secure refresh cookies
- Email verification and password-reset tokens with expiration
- Role-based access checks in API routes
- Logout invalidates the refresh session; password reset revokes existing sessions

## User states

- Loading while the client restores a session
- Unauthenticated on the sign-in screen
- Authenticated and routed according to role and onboarding state
- Invalid or expired verification/reset token with a recoverable error message
