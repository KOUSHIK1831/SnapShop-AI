<div align="center">

<img src="android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png" alt="SnapShop AI app icon" width="88" />

# SnapShop AI

**Turn a product photo into a storefront-ready listing. Run your local shop online.**

[![CI](https://github.com/KOUSHIK1831/SnapShop-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/KOUSHIK1831/SnapShop-AI/actions/workflows/ci.yml)
[![Node.js 26+](https://img.shields.io/badge/Node.js-26%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue)](LICENSE)

[Features](#features) · [Quick start](#quick-start) · [Architecture](#architecture) · [API](#api-and-development) · [Guides](#documentation)

</div>

SnapShop AI is a full-stack, multi-store commerce platform for neighborhood retailers. Sellers manage digital storefronts, products, inventory, and orders; buyers discover shops, browse catalogs, and track purchases. Optional vision-language model integrations draft product details from images, with seller review before publishing.

## Features

- **AI-assisted listings:** Draft fashion-product titles, descriptions, prices, categories, and tags from photos using Gemini or Groq; review the results before saving.
- **Seller workspace:** Store onboarding, product variants, stock management, low-stock alerts, order fulfillment, and analytics.
- **Buyer experience:** Public storefront discovery, search, cart, checkout preferences, order history, and tracking.
- **Multi-role access:** Email/password and optional Google sign-in; buyer, seller, admin, and volunteer roles.
- **Localized interface:** English, Hindi, and Telugu.
- **Administration:** Seller verification, user controls, moderation, and platform insights.
- **WhatsApp integration (prototype):** Webhook, catalog lookup, conversational ordering, and UPI deep-link generation with external credentials.

> [!NOTE]
> AI product digitization uses a mock response when provider keys are absent, so you can try the workflow locally. The WhatsApp flow is a prototype, not a production-ready payment or customer-support system; generating a UPI link does **not** confirm a payment.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS, Radix UI, TanStack Query |
| Backend | Node.js, Express 5, TypeScript, REST API |
| Data | PostgreSQL 16, Prisma 6 |
| Auth | JWT access tokens, HTTP-only refresh cookies, Argon2, optional Google OAuth |
| AI | Google Gemini and Groq vision models |
| Storage / email | Local or S3-compatible storage; console or Resend email |
| Tooling | pnpm workspaces, Turborepo, Vitest, Testing Library, Playwright |
| Mobile | Capacitor Android project shell |

## Quick start

**Requirements:** Node.js **26+**, pnpm **11.28.5**, and PostgreSQL 16 (or Docker for the provided local database). Run these commands from the repository root.

1. **Clone and install.**

   ~~~bash
   git clone https://github.com/KOUSHIK1831/SnapShop-AI.git
   cd SnapShop-AI
   corepack enable
   corepack prepare pnpm@11.28.5 --activate
   pnpm install
   ~~~

2. **Create local environment files.**

   ~~~bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ~~~

3. **Start PostgreSQL** (skip this if you already have a compatible database).

   ~~~bash
   docker compose up -d postgres
   ~~~

   In `apps/api/.env`, set both Prisma URLs to the local database:

   ~~~dotenv
   DATABASE_URL=postgresql://snapshop:snapshop_dev_password@localhost:5432/snapshop?schema=public
   DIRECT_URL=postgresql://snapshop:snapshop_dev_password@localhost:5432/snapshop?schema=public
   ~~~

   Replace the example JWT secrets with distinct values of at least 32 characters, and set a local-only `ADMIN_PASSWORD` before seeding. The web app's example `VITE_API_URL` already targets the local API.

4. **Initialize and run.**

   ~~~bash
   pnpm db:generate
   pnpm db:migrate
   pnpm --filter @snapshop/api db:seed
   pnpm dev
   ~~~

   The seed adds demo stores, products, and accounts for local testing. **Never seed a production database.**

| Service | Local URL |
| --- | --- |
| Web app | http://localhost:8080 |
| REST API | http://localhost:4000/api/v1 |
| Swagger UI | http://localhost:4000/docs |
| OpenAPI JSON | http://localhost:4000/openapi.json |
| Health checks | http://localhost:4000/health · http://localhost:4000/ready |

> [!TIP]
> Google sign-in, live AI models, email delivery, and WhatsApp messaging are optional for the first local run. See the [development guide](docs/development.md) for additional setup details.

## Configuration

Use the checked-in examples as the source of truth: [API variables](apps/api/.env.example) and [web variables](apps/web/.env.example). Do not commit actual `.env` files or credentials.

| Purpose | Variables |
| --- | --- |
| Database | `DATABASE_URL`, `DIRECT_URL` |
| API / auth | `APP_URL`, `API_PUBLIC_URL`, `CORS_ORIGINS`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` |
| Frontend | `VITE_API_URL`, optional `VITE_GOOGLE_CLIENT_ID` |
| Image AI | `AI_PROVIDER`, `GEMINI_API_KEY`, `GROQ_API_KEY` |
| Storage | `STORAGE_DRIVER` and, for S3, the `S3_*` variables |
| Other optional services | Google OAuth, Resend, Meta WhatsApp Cloud API, Sentry, PostHog |

> [!IMPORTANT]
> Production requires strong JWT secrets, HTTPS, an appropriately restricted CORS configuration, and `STORAGE_DRIVER=s3` with a private S3-compatible bucket. The included Compose credentials and demo accounts are for local development only.

## Architecture

```text
React / Vite client (apps/web)
           |
           | REST /api/v1
           v
Express API (apps/api)
   |       |         |
   |       |         +-- Gemini / Groq (optional AI)
   |       +------------ Local / S3 storage
   +-- Prisma ORM
           |
       PostgreSQL
```

The API owns authentication, authorization, data validation, business logic, and persistence. The web client communicates through the API rather than connecting directly to the database.

```text
apps/
  web/               React storefront and seller/admin UIs
  api/               Express routes, services, Prisma, tests
packages/
  shared/            Shared schemas and types
  config/            Shared TypeScript configuration
android/             Capacitor Android shell
ai-eval/             AI evaluation fixtures
docs/                Development documentation
```

## API and development

The API is served under `/api/v1`; [Swagger UI](http://localhost:4000/docs) documents available routes and request schemas. Route groups include `/auth`, `/sellers`, `/products`, `/cart`, `/orders`, `/files`, `/ai`, `/whatsapp`, `/analytics`, `/feedback`, and `/admin`. Protected routes require the appropriate authenticated role.

Common workspace commands:

```bash
pnpm dev                 # Run web and API
pnpm build               # Build workspaces
pnpm typecheck           # Type-check
pnpm lint                # Lint web workspace
pnpm test                # Run Vitest suites
pnpm format:check        # Verify formatting
pnpm db:studio           # Open Prisma Studio
```

The repository also includes web Playwright E2E specs and a GitHub Actions workflow that runs migrations, tests, typechecks, linting, and builds against PostgreSQL. Apply committed migrations in production with `pnpm --filter @snapshop/api db:deploy`, not the development migration command.

## Documentation

- [Local development](docs/development.md)
- [Buyer manual](USER_MANUAL_BUYER.md)
- [Seller manual](USER_MANUAL_SELLER.md)
- [Product requirements](Planning/01-PRD.md) · [Technical requirements](Planning/02-TRD.md)
- [Application flow](Planning/03-AppFlow.md) · [UI/UX brief](Planning/04-UI-UX-Brief.md)
- [Report a bug or request a feature](https://github.com/KOUSHIK1831/SnapShop-AI/issues)

The web app includes Vercel SPA rewrite configuration; the API requires a separate Node.js host and PostgreSQL deployment. No verified public demo URL is currently published in this repository.
