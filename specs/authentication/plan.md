# Authentication implementation notes

Authentication is implemented by the Express API in `apps/api/src/services/auth.ts` and `apps/api/src/routes/auth.ts`. The web client stores the short-lived access token in memory and sends the refresh cookie with API requests.

## Flow

1. Register or sign in through the API.
2. Restore a session through the refresh endpoint on app startup.
3. Load the current user and role from the API.
4. Gate protected pages by authentication and role.
5. Verify email or reset a password with a one-time token.

The API is authoritative for identity, role, session rotation, and token revocation.
