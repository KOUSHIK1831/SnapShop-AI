# 📸 SnapShop AI — Full-Stack Commerce & AI Digitization

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-ef4444?logo=turborepo)](https://turbo.build/)
[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-5.x-black?logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)](https://www.prisma.io/)
[![Google Gemini](https://img.shields.io/badge/Gemini_2.5_Flash-AI_Vision-4285F4?logo=google)](https://aistudio.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

**SnapShop AI** is a production-grade, full-stack commerce and catalog digitization platform designed for local retailers and clothing merchants. Sellers snap photos of their apparel inventory, Google Gemini 2.5 Flash extracts titles, descriptions, prices, categories, and size variants in seconds, and merchants get an instant, shareable, multi-tenant digital storefront.

> Empowering small retailers to go digital in under 2 minutes — with zero monthly infrastructure costs.

---

## 🏗️ Architecture & Monorepo Layout

SnapShop AI is structured as a high-performance monorepo powered by **pnpm** and **Turborepo**:

```text
SnapShop-AI/
├── apps/
│   ├── api/                    # Node.js 22 + Express 5 REST API & Socket.IO server
│   │   ├── prisma/             # Prisma 6 schema (24 models), migrations & seed script
│   │   ├── src/
│   │   │   ├── auth/           # Actor models, JWT & httpOnly cookie utilities
│   │   │   ├── config/         # Strict Zod-validated environment schema
│   │   │   ├── docs/           # OpenAPI 3.1 specification & Swagger UI
│   │   │   ├── middleware/     # RBAC guards, Helmet, CORS, Pino logger, error handler
│   │   │   ├── repositories/   # Scoped data access layer (Cart, Orders, Products, Sellers)
│   │   │   ├── routes/         # Auth, Products, Sellers, Cart, Orders, Files, AI, Admin
│   │   │   ├── services/       # AI Digitize (Gemini + Groq), WhatsApp Agent, Resend mailer
│   │   │   ├── storage/        # Pluggable storage adapters (Local disk / Cloudflare R2 / S3)
│   │   │   └── realtime.ts     # Socket.IO realtime connection & event dispatchers
│   │   └── tests/              # Vitest API test suites (Health, Routes, Migration, Phase 4, Security)
│   └── web/                    # React 18 + Vite SPA client
│       ├── public/             # Static assets, PWA manifest, favicons
│       ├── src/
│       │   ├── components/     # UI primitives (shadcn/Radix), CartDrawer, UploadZone, etc.
│       │   ├── hooks/          # useAuth (REST/Google), useSeller, useCart, useSocket
│       │   ├── lib/            # apiClient (in-memory token + refresh), upload, analytics
│       │   ├── locales/        # Trilingual translation dictionaries (en, hi, te - 800+ keys)
│       │   └── pages/          # Storefront, Dashboard, BuyerDashboard, Admin, Onboarding
│       └── tests/              # Vitest unit & component test suites (58 test files)
├── packages/
│   ├── config/                 # Shared TypeScript & build configs
│   └── shared/                 # Shared DTOs, Zod schemas, pagination & types
├── android/                    # Capacitor Android native shell
├── docs/                       # Architectural specs & technical documentation
├── docker-compose.yml          # Optional local dev services (Postgres, MinIO, Mailpit)
├── turbo.json                  # Turborepo task pipeline configuration
└── pnpm-workspace.yaml         # Monorepo package workspace definitions
```

---

## ✨ Core Capabilities

| Capability                      | Technical Implementation                                                                                                                                                                                                                                          |
| :------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **🤖 AI Catalog Digitization**  | Client-side compression to ~100KB $\rightarrow$ S3/R2 presigned upload $\rightarrow$ Google Gemini 2.5 Flash vision extraction with Groq fallback. Categorizes apparel, generates titles, prices, tags, and size variants with human-in-the-loop (HITL) approval. |
| **🔐 Google OAuth 2.0 & RBAC**  | Native Google Identity Services ID token verification with server-side account linking, role onboarding modal (`seller` vs `buyer`), short-lived JWT access tokens in memory, and rotating httpOnly refresh cookies.                                              |
| **🛒 Multi-Item Shopping Cart** | Slide-over cart drawer (`CartDrawer.tsx`), quantity management, persistent buyer carts, order checkout state machine (`pending` $\rightarrow$ `accepted` $\rightarrow$ `shipped` $\rightarrow$ `delivered`), and payment proof uploads.                           |
| **💬 WhatsApp AI Sales Agent**  | Autonomous sales bot powered by Meta WhatsApp Cloud webhook and Gemini 2.5 Flash function-calling (`get_products`, `place_order`, `get_datetime`, `generate_upi_payment`).                                                                                        |
| **⚡ Realtime Order Dispatch**  | Socket.IO room broadcasting for instant seller dashboard notifications (`order:new`, `order:status`, `user:blocked`).                                                                                                                                             |
| **🌍 Trilingual Localization**  | 100% complete UI translations across **English**, **Hindi (हिन्दी)**, and **Telugu (తెలుగు)** with automatic persistence and an inline phonetic Telugu virtual keyboard.                                                                                          |
| **🛡️ Enterprise Hardening**     | Helmet HTTP security headers, RFC 7807 problem details error responses, rate-limiting, comprehensive audit logging, and cross-tenant scoped database repositories.                                                                                                |
| **📱 Mobile Ready**             | Capacitor Android integration with native back button listeners and mobile bottom bar navigation.                                                                                                                                                                 |

---

## 💰 100% Free Production Stack (€0 / ₹0 / $0 per month)

SnapShop AI is engineered to run completely free for development, demos, and early-stage production:

| Layer                 | Free Provider                                                                   | Free Tier Allocation                                    | Production Role                                                 |
| :-------------------- | :------------------------------------------------------------------------------ | :------------------------------------------------------ | :-------------------------------------------------------------- |
| **Database**          | [Neon](https://neon.tech)                                                       | 0.5 GB storage, autosuspending serverless Postgres      | Primary relational DB & pooled Prisma connections               |
| **Object Storage**    | [Cloudflare R2](https://www.cloudflare.com/products/r2/)                        | 10 GB storage, 1M ops, **$0 egress fees**               | Product images, receipts, verification documents                |
| **API Compute**       | [Render](https://render.com) / [Koyeb](https://www.koyeb.com)                   | 512 MB RAM, 750 free instance hours/month               | Express 5 REST API + Socket.IO (pinged via UptimeRobot)         |
| **Web Frontend**      | [Vercel](https://vercel.com) / [Cloudflare Pages](https://pages.cloudflare.com) | Unlimited requests, global edge CDN                     | Single-page application hosting                                 |
| **AI Vision & Agent** | [Google AI Studio](https://aistudio.google.com) + [Groq](https://groq.com)      | Generous daily free requests (Gemini 2.5 Flash + Llama) | Vision digitization + WhatsApp tool calling (no Anthropic cost) |
| **Email Delivery**    | [Resend](https://resend.com)                                                    | 3,000 emails/month (100 emails/day)                     | Password resets and transactional notifications                 |
| **Authentication**    | [Google Cloud Console](https://console.cloud.google.com)                        | Free forever OAuth 2.0 client IDs                       | Google Sign-In & Sign-Up                                        |
| **CI/CD**             | [GitHub Actions](https://github.com/features/actions)                           | 2,000 minutes/month                                     | Automated lint, typecheck, migrations, and test runner          |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** $\ge 20$ (Node 22 LTS recommended)
- **pnpm** $\ge 9$ (`npm install -g pnpm`)
- PostgreSQL instance (Neon free tier or local Docker)

### 1. Clone the repository

```bash
git clone https://github.com/KOUSHIK1831/SnapShop-AI.git
cd SnapShop-AI
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Copy the example environment templates:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Key environment settings:

- **`apps/api/.env`**:
  ```bash
  DATABASE_URL="postgresql://user:password@ep-sample-pooler.region.neon.tech/snapshop?sslmode=require"
  DIRECT_URL="postgresql://user:password@ep-sample.region.neon.tech/snapshop?sslmode=require"
  JWT_ACCESS_SECRET="generate-at-least-32-random-characters-here"
  JWT_REFRESH_SECRET="generate-at-least-32-random-characters-here"
  GEMINI_API_KEY="your-free-google-ai-studio-key"
  GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
  ```
- **`apps/web/.env`**:
  ```bash
  VITE_API_URL=http://localhost:4000/api/v1
  VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
  ```

### 4. Database Initialization

Generate Prisma client, run migrations, and seed initial demo accounts:

```bash
pnpm --filter @snapshop/api db:generate
pnpm --filter @snapshop/api db:migrate
pnpm --filter @snapshop/api db:seed
```

_Default admin account:_ `admin@snapshop.local` / `ChangeMe123!`

### 5. Start Development Servers

Run both the React frontend (:8080) and Express API (:4000) concurrently via Turborepo:

```bash
pnpm dev
```

- **Web Application:** `http://localhost:8080`
- **REST API:** `http://localhost:4000/api/v1`
- **Interactive Swagger Docs:** `http://localhost:4000/docs`
- **OpenAPI 3.1 Spec:** `http://localhost:4000/openapi.json`
- **API Health Check:** `http://localhost:4000/health`

---

## 📜 Available Scripts

| Command             | Action                                                              |
| :------------------ | :------------------------------------------------------------------ |
| `pnpm dev`          | Start all apps in watch mode with live reloading                    |
| `pnpm build`        | Compile packages, build API with `tsup`, and bundle web with `vite` |
| `pnpm test`         | Run Vitest across all workspace packages (63 test files, 375 tests) |
| `pnpm typecheck`    | Run TypeScript `tsc --noEmit` validation across monorepo            |
| `pnpm lint`         | Run ESLint checks across all apps                                   |
| `pnpm format`       | Auto-format codebase using Prettier                                 |
| `pnpm format:check` | Check code formatting compliance                                    |
| `pnpm db:generate`  | Generate Prisma client from `schema.prisma`                         |
| `pnpm db:migrate`   | Apply Prisma database migrations                                    |
| `pnpm db:seed`      | Seed initial database accounts and demo stores                      |
| `pnpm db:studio`    | Launch Prisma Studio GUI browser interface                          |

---

## 📡 REST API Reference

The backend exposes an **OpenAPI 3.1** specification accessible interactively at `/docs`.

| Method  | Endpoint                           | Description                                     | Auth / Role     |
| :------ | :--------------------------------- | :---------------------------------------------- | :-------------- |
| `POST`  | `/api/v1/auth/register`            | Register with email, password & role            | Public          |
| `POST`  | `/api/v1/auth/login`               | Login with email/password; returns JWT + cookie | Public          |
| `POST`  | `/api/v1/auth/google`              | Sign-in or register using Google OAuth ID token | Public          |
| `POST`  | `/api/v1/auth/refresh`             | Rotate access & refresh tokens                  | Refresh Cookie  |
| `PATCH` | `/api/v1/auth/role`                | Complete role onboarding (`seller` vs `buyer`)  | Bearer Token    |
| `GET`   | `/api/v1/sellers/me`               | Fetch authenticated seller profile              | Seller          |
| `PATCH` | `/api/v1/sellers/me`               | Update seller store information & UPI settings  | Seller          |
| `GET`   | `/api/v1/products`                 | Query products with filters & pagination        | Public / Seller |
| `POST`  | `/api/v1/products`                 | Create catalog item with size variants          | Seller          |
| `GET`   | `/api/v1/cart`                     | Retrieve current buyer shopping cart            | Buyer           |
| `POST`  | `/api/v1/cart/items`               | Add product variant to cart                     | Buyer           |
| `POST`  | `/api/v1/orders`                   | Checkout cart and generate order                | Buyer           |
| `GET`   | `/api/v1/orders/:id/track`         | Public token order tracking                     | Public          |
| `POST`  | `/api/v1/files/presign`            | Issue presigned S3/R2 upload PUT URL            | Bearer Token    |
| `POST`  | `/api/v1/files/confirm`            | Confirm upload completion                       | Bearer Token    |
| `POST`  | `/api/v1/ai/digitize`              | Gemini 2.5 Flash clothing extraction            | Seller          |
| `GET`   | `/api/v1/whatsapp/webhook`         | Meta WhatsApp Cloud challenge verification      | Public          |
| `POST`  | `/api/v1/whatsapp/webhook`         | Incoming WhatsApp message handler               | Public          |
| `GET`   | `/api/v1/analytics/seller`         | Revenue, order stats & volume trends            | Seller          |
| `GET`   | `/api/v1/admin/overview`           | Platform-wide stats, audit logs, seller list    | Admin           |
| `PATCH` | `/api/v1/admin/users/:id/block`    | Block or unblock user access                    | Admin           |
| `PATCH` | `/api/v1/admin/sellers/:id/verify` | Approve or reject seller KYC verification       | Admin           |

---

## 🧪 Testing & Verification

SnapShop AI maintains strict testing standards:

- **Full Suite Execution:**
  ```bash
  pnpm test
  ```
  Runs **63 test files and 375 tests with 100% passing results**.
- **Security & RBAC Suite:** `apps/api/tests/security.test.ts` validates token verification, role elevation prevention, rate limit standard headers, and cross-tenant access control.
- **Type Checking:**
  ```bash
  pnpm typecheck
  ```
  Runs `tsc --noEmit` across all 4 workspace packages with zero errors.
- **Production Build:**
  ```bash
  pnpm build
  ```
  Builds `@snapshop/api` via `tsup` (Node 22 target) and `@snapshop/web` via `vite` cleanly in ~10 seconds.

---

## 📱 Native Android Deployment

SnapShop AI includes pre-configured **Capacitor** integration for building Android applications:

```bash
# Sync web build to the Android project
pnpm --filter @snapshop/web build
npx cap sync android

# Open Android Studio
npx cap open android
```

---

## 📄 License

This project is licensed under the **GNU Affero General Public License (AGPL) v3**. See the [LICENSE](LICENSE) file for details.
