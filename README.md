# 🛍️ ApnaBazar — Digitize Your Store

**AI-powered digitization platform for local clothing sellers.** Upload photos of your products, let AI extract titles, descriptions, prices & categories, and instantly get a shareable online storefront.

> Built for the hackathon — empowering small retailers to go digital in under 2 minutes.

Public URL - https://apna-bazar-cs.vercel.app

---

## ✨ Features

| Feature | Description |
|---|---|---|
| **🤖 AI Product Digitization** | Upload product images → **Automatic frontend compression to ~100KB** → Gemini 2.5 Flash extracts title, description, price, category & tags with robust error handling (Zod validation, auto-retry, fallback) |
| **👤 HITL Review Step** | Human-in-the-Loop review card after AI extraction — seller approves/edits title, price, stock before saving to DB |
| **📱 Instant Storefront & App** | Every seller gets a public `/store/:slug` page with customizable banner + theme color. Mobile via Capacitor (Android). |
| **🔐 Role-Based Access Control** | Admin, Seller, and Buyer roles with Supabase Auth, RBAC route guards, and strict RLS policies. |
| **🛒 Order & Stock Management** | End-to-end flow: size variants, stock tracking, low-stock alerts, order → stock decrement, status transitions (pending→confirmed→completed/cancelled) |
| **📊 Seller Dashboard** | Analytics (revenue, order volume, insights), inventory editor, realtime order notifications |
| **💬 WhatsApp Integration** | WhatsApp AI sales agent edge function + direct seller contact from product storefront |
| **🌍 Multi-language Support** | Full i18n for **English**, **Hindi (हिन्दी)**, and **Telugu (తెలుగు)** with language persistence |
| **📊 Admin Dashboard** | Platform-wide metrics, user management, seller verification/blocking, feedback handling |
| **📈 Analytics & Benchmarks** | PostHog event tracking, AI accuracy evaluation (80% category accuracy), performance benchmarks documented |
| **📱 Mobile Support** | Capacitor Android build, bottom tab navigation, native back-button handling |

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 5](https://vitejs.dev/) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Backend / BaaS** | [Supabase](https://supabase.com/) — Auth, PostgreSQL DB, Edge Functions, Storage, Realtime |
| **AI** | Google Gemini 2.5 Flash (via Supabase Edge Function) |
| **Routing** | [React Router v6](https://reactrouter.com/) |
| **State & Data** | [TanStack React Query](https://tanstack.com/query) |
| **Mobile** | [Capacitor](https://capacitorjs.com/) (Android) |
| **Testing** | [Vitest](https://vitest.dev/) (Unit) + [Playwright](https://playwright.dev/) (E2E) |

---

## 📁 Project Structure

```text
hackathon-cs/
├── android/                    # Capacitor Android project files
├── e2e/                        # Playwright end-to-end tests (auth, upload, storefront, i18n)
├── public/                     # Static assets
├── scripts/                    # Utility scripts (AI evaluation, benchmark, i18n extraction)
├── src/
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── AppTour.tsx         # First-login onboarding walkthrough
│   │   ├── BackButtonHandler.tsx # Android back-button handling
│   │   ├── BottomNav.tsx       # Mobile bottom tab navigation
│   │   ├── BuyerAuthModal.tsx  # Buyer order auth modal
│   │   ├── ErrorBoundary.tsx   # React error boundary
│   │   ├── FeedbackModal.tsx   # User feedback form
│   │   ├── InventoryEditor.tsx # Bulk stock editor
│   │   ├── LanguageSwitcher.tsx
│   │   ├── NetworkStrengthIndicator.tsx
│   │   ├── OfflineBanner.tsx   # Network status banner
│   │   ├── OrderConfirmation.tsx
│   │   ├── Orders.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProtectedRoute.tsx  # RBAC route guard
│   │   ├── ReviewCard.tsx      # HITL review card
│   │   ├── StoreSettings.tsx
│   │   ├── StoreSetup.tsx
│   │   ├── ThemeProvider.tsx / ThemeToggle.tsx
│   │   ├── UploadZone.tsx      # Multi-file upload with compression
│   │   └── *.test.tsx          # Vitest test files co-located
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.tsx         # Supabase Auth wrapper
│   │   ├── useSeller.tsx       # Seller data CRUD (5 entities)
│   │   ├── useNetworkStrength.tsx # Online/offline + connection type
│   │   ├── useTeluguTyping.tsx # Telugu keyboard input helper
│   │   ├── useWelcomeTour.ts   # App tour state
│   │   ├── use-mobile.tsx      # Mobile detection
│   │   └── use-toast.ts        # Toast notifications
│   ├── integrations/supabase/  # Typed Supabase client
│   ├── lib/                    # Utilities
│   │   ├── analytics.ts        # PostHog analytics wrapper
│   │   ├── constants.ts
│   │   ├── supabase.ts         # Supabase client
│   │   ├── teluguKeyboard.ts   # Telugu input layout
│   │   ├── utils.ts            # Image compression, helpers
│   │   └── *.test.ts           # Co-located tests
│   ├── locales/en|hi|te/       # i18n translation JSON (750+ keys)
│   ├── pages/                  # Route pages
│   │   ├── Index.tsx           # Landing page
│   │   ├── Auth.tsx            # Login / Sign-up with role picker
│   │   ├── Dashboard.tsx       # Seller dashboard
│   │   ├── Admin.tsx           # Admin dashboard
│   │   ├── BuyerDashboard.tsx  # Buyer dashboard
│   │   ├── Storefront.tsx      # Public storefront
│   │   ├── TrackOrder.tsx      # Order tracking
│   │   ├── ResetPassword.tsx   # Password reset
│   │   ├── NotFound.tsx        # 404 page
│   │   └── *.test.tsx          # Co-located tests
│   ├── test/setup.ts           # Vitest setup
│   ├── App.tsx                 # Root app with routing & providers
│   ├── i18n.ts                 # i18n configuration
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles & Tailwind directives
├── supabase/
│   ├── functions/              # Edge functions
│   │   ├── digitize/           # AI product extraction (Gemini 2.5 Flash)
│   │   ├── order-notifications/# Order status notifications
│   │   └── whatsapp-agent/     # WhatsApp AI sales agent
│   ├── migrations/             # SQL migrations (RBAC, stock, realtime, etc.)
│   └── config.toml             # Supabase project config
├── docs/                       # Documentation
│   ├── api.md                  # API endpoint reference
│   ├── futureplans.md          # WhatsApp AI Sales Agent — future scope
│   └── rp1.md                  # Initial project evaluation
├── package.json
├── capacitor.config.ts
├── playwright.config.ts
├── tailwind.config.ts
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
└── .env                        # Environment variables (not committed)
```

---

## 🗄️ Database Schema

The schema powered by Supabase PostgreSQL includes:

- `profiles` / `sellers`: RBAC user definitions (admin/seller/buyer roles), store information, banner & theme customization, seller verification.
- `products`: Catalog with size variants, stock & low-stock threshold, AI-generated tags, and pricing. Color-coded stock badges.
- `orders`: Realtime order tracking with unit price, status transitions (pending→confirmed→completed/cancelled), automatic stock decrement on confirmation.
- `feedback`: Customer and seller support requests with Admin response tracking.
- `files`: Uploaded image records linked to AI generation jobs.
- `whatsapp_conversations`: JSONB-based conversation memory for WhatsApp bot interactions.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18 — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **npm** (comes with Node.js) or **bun**
- A **Supabase** project (for auth, database, storage & edge functions)
- A **Gemini API Key** from Google AI Studio.

### 1. Clone the repository

```bash
git clone <YOUR_GIT_URL>
cd hackathon-cs
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

### 4. Backend & Database Setup (Supabase CLI)

1. Install the CLI: `npm install -g supabase`
2. Login & Link: `supabase login` and `supabase link --project-ref <your-project-id>`
3. Push migrations: `supabase db push`
4. Deploy edge functions: `supabase functions deploy`
5. Set Gemini API key: `supabase secrets set LOVABLE_API_KEY=your_key`

### 5. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production web build |
| `npm run validate` | Run linting, type-check, and unit tests |
| `npm run test` | Run unit tests with Vitest |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run evaluate-ai` | Run the AI evaluation benchmark script |
| `npm run benchmark` | Run performance benchmarks (compression, latency, pipeline) |
| `npm run i18n:scan` | Scan for missing translation keys |
| `npx playwright test` | Run Playwright E2E tests |
| `npx cap sync android` | Sync Capacitor Android build |

---

## 🧪 Testing & Evaluation

- **Unit Testing (Vitest)**: Co-located tests for components, hooks, utils (compressImage, useSeller, edge function parsing, i18n coverage). Over 20 test files across the project.
- **E2E Testing (Playwright)**: 4 spec files covering Auth, Upload, Storefront, and i18n flows (`npx playwright test`).
- **AI Benchmarking**: `scripts/evaluate-ai.ts` measures Gemini extraction accuracy across categories, price, and tags (80% category accuracy achieved).
- **Performance Benchmarking**: `scripts/benchmark.ts` measures compression ratio, upload latency, AI processing time (P50/P95), and full pipeline time vs manual entry.

---

## 🌐 Routes

| Path | Page | Access |
|---|---|---|---|
| `/` | Landing page | Public |
| `/auth` | Login / Sign-up | Public |
| `/dashboard` | Seller dashboard | 🔒 Protected (Seller) |
| `/admin` | Admin dashboard | 🔒 Protected (Admin) |
| `/buyer` | Buyer dashboard | 🔒 Protected (Buyer) |
| `/store/:slug` | Public storefront | Public |
| `/track-order/:orderId` | Track orders | 🔒 Protected (Buyer) |
| `/reset-password` | Password reset | Public |
| `*` | 404 Not Found | Public |

---

## 🛍️ Storefront Buyer Flow

The buyer flow on the public storefront is:

1. Browse products on `/store/:slug` with stock status badges
2. Click "Order Now" → BuyerAuthModal (name + phone or sign-in)
3. Place order → OrderConfirmation modal with order details
4. Seller receives realtime notification in Dashboard Orders tab
5. Seller confirms order → stock decrements automatically
6. Buyer can track order status on `/track-order/:orderId`
7. Buyers can contact the seller directly on WhatsApp from the product card

---

## 🤖 AI Digitization Flow

1. Seller uploads a product image via the **UploadZone** component
2. **Frontend Compression**: Large images are automatically compressed to ~100KB in the browser
3. Image is stored in **Supabase Storage**
4. The `digitize` **Supabase Edge Function** is invoked (JWT-protected, rate-limited)
5. The function sends the image to **Google Gemini 2.5 Flash** for analysis
6. AI output is validated with **Zod schema** — auto-retries up to 3 times on malformed JSON
7. Non-clothing images are detected and rejected gracefully
8. AI returns structured JSON: `title`, `description`, `price`, `category`, `tags`
9. **HITL Review Card** appears — seller can edit fields before approving
10. On approval, product is saved to the `products` table and appears in the seller's catalog

---

## 📱 Mobile (Android)

ApnaBazar includes a Capacitor setup for generating native Android apps.
To build and sync for Android:
```bash
npx cap sync android
npx cap open android
```

---

## 🌍 Internationalization

The app supports three languages out of the box (750+ translated keys each):

-  **English** (`en`)
-  **Hindi** (`hi`)
-  **Telugu** (`te`)

Users can switch languages using the **LanguageSwitcher** component in the navbar. Language preference is persisted in `localStorage`. Product data can also be generated in the seller's chosen language via AI localization.

---

## 📄 License

This project was built for a hackathon. All rights reserved.
