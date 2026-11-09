# Local development

## Requirements

- Node.js 26 (see `.nvmrc`)
- pnpm 11.28.5 through Corepack
- PostgreSQL 16 or a compatible PostgreSQL database

Docker is optional. The Compose file provides PostgreSQL and MinIO. The API defaults to local file storage and console email; configure its S3 settings if you want to use MinIO.

## First run

```bash
corepack enable
corepack prepare pnpm@11.28.5 --activate
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Set `DATABASE_URL` and `DIRECT_URL` in `apps/api/.env`. Set a local-only `ADMIN_PASSWORD` before seeding. Configure `VITE_GOOGLE_CLIENT_ID` if you want to use Google sign-in.

```bash
pnpm --filter @snapshop/api db:generate
pnpm --filter @snapshop/api db:migrate
pnpm --filter @snapshop/api db:seed
pnpm dev
```

The demo seed is blocked when `NODE_ENV=production`. Do not deploy its demo accounts.

| Service       | URL                          |
| ------------- | ---------------------------- |
| Web (Vite)    | http://localhost:8080        |
| API           | http://localhost:4000        |
| API health    | http://localhost:4000/health |
| API readiness | http://localhost:4000/ready  |
| API docs      | http://localhost:4000/docs   |

Vite proxies `/api/v1` to the local API server.

## Useful commands

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm db:studio
```

The root lint task currently covers the web workspace. Use package filters to run commands in one app, for example `pnpm --filter @snapshop/api test`.

## Repository layout

```text
apps/web             React/Vite client
apps/api             Express API and Prisma database layer
packages/shared      Shared schemas and types
packages/config      Shared TypeScript configuration
android              Android project shell
```
