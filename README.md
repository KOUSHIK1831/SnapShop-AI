# SnapShop AI

SnapShop AI is a multilingual storefront and inventory platform for local retailers. It is maintained as a pnpm monorepo with a React web app, an Express API, and a PostgreSQL database managed with Prisma.

## Repository layout

```text
apps/
  api/                 Express API, Prisma schema/migrations, seed, API tests
  web/                 React/Vite app, UI tests, translations
packages/
  config/              Shared TypeScript configuration
  shared/              Shared validation schemas and types
android/               Android project shell
ai-eval/               AI evaluation fixtures and generated local results
docs/                  Development and operational guides
Planning/              Product requirements and design context
specs/                 Current feature specifications
```

## Requirements

- Node.js 26 (see `.nvmrc`)
- pnpm 11.28.5 through Corepack
- PostgreSQL 16 or a compatible PostgreSQL service

```bash
corepack enable
corepack prepare pnpm@11.28.5 --activate
```

## Local setup

1. Install dependencies and copy the environment templates:

   ```bash
   pnpm install
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

2. Set `DATABASE_URL` and `DIRECT_URL` in `apps/api/.env`. Set a local-only `ADMIN_PASSWORD` before seeding. Configure `VITE_GOOGLE_CLIENT_ID` in the web environment if you want Google sign-in.

3. Generate the Prisma client, apply the development migration, seed local data, and start both apps:

   ```bash
   pnpm --filter @snapshop/api db:generate
   pnpm --filter @snapshop/api db:migrate
   pnpm --filter @snapshop/api db:seed
   pnpm dev
   ```

   Seeding is blocked when `NODE_ENV=production`. It creates an administrator using `ADMIN_EMAIL` and `ADMIN_PASSWORD`, plus local demo seller, buyer, and volunteer accounts. Those demo accounts use the development-only password `Password123!`; never deploy seeded demo accounts.

The optional Docker Compose stack starts PostgreSQL and MinIO. The API defaults to local file storage and console email. Configure its S3 settings to use MinIO. Docker is optional when you already have PostgreSQL.

| Service       | URL                                |
| ------------- | ---------------------------------- |
| Web app       | http://localhost:8080              |
| API           | http://localhost:4000              |
| API health    | http://localhost:4000/health       |
| API readiness | http://localhost:4000/ready        |
| API docs      | http://localhost:4000/docs         |
| OpenAPI JSON  | http://localhost:4000/openapi.json |

## Common commands

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `pnpm dev`          | Start the web app and API          |
| `pnpm build`        | Build the workspaces               |
| `pnpm typecheck`    | Type-check configured workspaces   |
| `pnpm lint`         | Run the configured web ESLint task |
| `pnpm test`         | Run API and web Vitest suites      |
| `pnpm format:check` | Check Prettier formatting          |
| `pnpm db:generate`  | Generate the Prisma client         |
| `pnpm db:migrate`   | Run local development migrations   |
| `pnpm db:studio`    | Open Prisma Studio                 |

See [Local development](docs/development.md) for environment details and [Contributing](CONTRIBUTING.md) for the pull request workflow. Buyer and seller guides are in [USER_MANUAL_BUYER.md](USER_MANUAL_BUYER.md) and [USER_MANUAL_SELLER.md](USER_MANUAL_SELLER.md).

## API

The API is mounted at `/api/v1`. It provides authentication, seller and product management, carts, orders, file uploads, AI digitization, messaging webhooks, feedback, analytics, and administration. Swagger UI at `/docs` and the OpenAPI document at `/openapi.json` are generated from the API source.

## Environment and deployment

The checked-in `.env.example` files are local examples. Never commit real credentials. Configure external credentials only for the features you enable, such as Google OAuth, AI services, object storage, messaging, and email. Web `VITE_*` values are bundled into client code and must never contain server secrets.

GitHub Actions runs the repository's CI workflow. Production deployments need a PostgreSQL database, production JWT secrets, a public object storage configuration, the required provider credentials, and separate web/API hosting configuration. The Android directory is a shell; this workspace does not currently define native build scripts.

## License

Licensed under the GNU Affero General Public License v3. See [LICENSE](LICENSE).
