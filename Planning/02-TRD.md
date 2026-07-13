# Document 02 — TRD: Technical Requirements Document

---

## Frontend

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite 5
- **Styling:** Tailwind CSS 3 + shadcn/ui (Radix primitives)
- **Routing:** React Router v6
- **State & Data:** TanStack React Query v5
- **I18n:** i18next + react-i18next (English, Hindi, Telugu)
- **Mobile:** Capacitor (Android only)

## Backend

- **Current:** Supabase (BaaS — Auth, PostgreSQL, Edge Functions, Storage, Realtime)
- **Target (Future):** Python FastAPI backend (see [`docs/api.md`](../docs/api.md))
- **Edge Functions:** Deno runtime (digitize, whatsapp-agent, order-notifications)

## Database

- **Type:** PostgreSQL via Supabase
- **Migrations:** Supabase CLI (`supabase db push`)
- **Key Tables:** `profiles`, `sellers`, `products`, `orders`, `files`, `feedback`, `conversations`

## Auth

- **Provider:** Supabase Auth
- **Methods:** Email/password
- **Roles:** Admin, Seller, Buyer (stored in `profiles` table)
- **RLS:** Row-level security on all tables
- **Edge Function Auth:** JWT verification (digitize), unauthenticated (whatsapp-agent webhook)

## Hosting

- **Frontend:** Vercel (production: `https://apna-bazar-cs.vercel.app`)
- **Backend:** Supabase (PostgreSQL, Edge Functions, Storage)
- **Mobile:** Capacitor Android build

## Third-Party APIs

| Service                       | Purpose                                           | Tier      |
| ----------------------------- | ------------------------------------------------- | --------- |
| Google Gemini 2.5 Flash       | AI product digitization (image → structured data) | Paid      |
| Anthropic Claude (opus-4-5)   | WhatsApp AI agent brain                           | Paid      |
| Meta WhatsApp Cloud API v25.0 | WhatsApp messaging                                | Free tier |
| PostHog                       | Product analytics & event tracking                | Free tier |

## Key Libraries

- `@supabase/supabase-js` — Supabase client
- `@anthropic-ai/sdk` — Claude AI SDK (Edge Function)
- `lucide-react` — Icons
- `zod` — Schema validation (Edge Function AI output)
- `@tanstack/react-query` — Server state management
- `react-i18next` — Internationalization

## Environment Variables

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
WHATSAPP_TOKEN
PHONE_NUMBER_ID
VERIFY_TOKEN
UPI_ID
STORE_SLUG
LOVABLE_API_KEY (Gemini)
VITE_POSTHOG_KEY
VITE_POSTHOG_HOST
```

## Constraints

- Must work on mobile browsers (Chrome for Android)
- Must support offline detection with graceful degradation
- Image compression to ~100KB before upload
- WhatsApp agent must handle guest orders (no buyer account needed)
- Must support Hindi, English, and Telugu UI
