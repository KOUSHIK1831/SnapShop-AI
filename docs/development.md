# Local development

## Requirements

- Node.js 26 (see `.nvmrc`)
- pnpm 11 (`corepack enable && corepack prepare pnpm@11.28.5 --activate`)

Docker is **not** required. Local development uses:

- **Neon free tier** (or any Postgres) for the database
- `STORAGE_DRIVER=local` for files
- `EMAIL_DRIVER=console` for email — links are printed in the API logs

## First run

```bash
pnpm install
pnpm --filter @snapshop/api db:generate
cp apps/api/.env.example apps/api/.env     # then fill in DATABASE_URL
cp apps/web/.env.example apps/web/.env     # only if you use optional keys
pnpm --filter @snapshop/api db:migrate     # or db:deploy in CI
pnpm --filter @snapshop/api db:seed
pnpm dev
```

| Service       | URL                          |
| ------------- | ---------------------------- |
| Web (Vite)    | http://localhost:8080        |
| API           | http://localhost:4000        |
| API health    | http://localhost:4000/health |
| API readiness | http://localhost:4000/ready  |

The Vite dev server proxies `/api/v1` to the API, so the client can call
same-origin URLs in development.

## Neon setup (free)

1. Create a project at <https://neon.tech>.
2. Copy **two** connection strings into `apps/api/.env`:
   - `DATABASE_URL` → the pooled connection string (contains `-pooler`)
   - `DIRECT_URL` → the direct connection string
3. Run `pnpm --filter @snapshop/api db:deploy` (or `db:migrate` while developing).

## Useful commands

```bash
pnpm dev                 # web + api via turbo
pnpm build               # build all workspaces
pnpm typecheck           # tsc in every workspace
pnpm test                # vitest in every workspace
pnpm lint                # eslint in every workspace
pnpm db:studio           # Prisma Studio
pnpm --filter @snapshop/api db:diff   # regenerate the init SQL offline
```

## Repository layout

```
apps/web      React 18 + Vite client (unchanged UI)
apps/api      Express 5 + Prisma REST API
packages/shared   Zod schemas shared by both
packages/config   shared tsconfig
supabase/     legacy migrations (reference for the Phase 2 data migration)
```
