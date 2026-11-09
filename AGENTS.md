# Project guide for coding agents

SnapShop AI is a pnpm monorepo with a React/Vite client, an Express/Prisma API, shared TypeScript packages, and an Android project shell.

## Source of truth

- `apps/api/prisma/schema.prisma` and its migrations define the active database schema.
- `apps/api/src/routes/` and `apps/api/src/repositories/` implement the HTTP API and data access.
- `apps/web/src/` implements the web client.
- `packages/shared/` contains schemas and types used across apps.
- `README.md` and `docs/development.md` describe setup and supported workflows.

All browser data access must go through the Express API. Do not add direct database clients or vendor-specific backend SDKs to the web app. Keep feature code and tests in their owning workspace.

## Product integrations

- Inventory digitization: `apps/api/src/services/ai/digitize.ts`
- Messaging automation: `apps/api/src/services/whatsapp/agent.ts`
- Authentication and password recovery: `apps/api/src/services/auth.ts`
- Localization: `apps/web/src/i18n.ts` and `apps/web/src/locales/`

## Local commands

Use Node.js 26 and pnpm 11.28.5. Common checks are `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
