# Document 06 — Implementation Plan: Step-by-Step Build Sequence

---

> **Status:** Project is in active development. Below is the build sequence that was followed and what remains.

## Phase 1: Project Setup ✅

- [x] Initialize Vite + React + TypeScript project
- [x] Install dependencies (shadcn/ui, Tailwind, React Router, TanStack Query, i18n)
- [x] Set up Supabase project (Auth, Database, Storage, Edge Functions)
- [x] Configure environment variables (`.env`)
- [x] Set up folder structure (`src/components`, `src/pages`, `src/hooks`, etc.)
- [x] Configure Tailwind theme (colors, fonts, dark mode)
- [x] Set up Capacitor for Android build

## Phase 2: Database ✅

- [x] Create migrations: `profiles`, `sellers`, `products`, `orders`, `files`, `feedback`, `conversations`
- [x] Set up RLS policies for all tables
- [x] Create indexes for performance
- [x] Set up triggers (auto-update timestamps, stock decrement on order confirm)

## Phase 3: Auth ✅

- [x] Implement Supabase Auth (signup, login, logout)
- [x] Build `useAuth` hook with session management
- [x] Create `ProtectedRoute` component (RBAC guard)
- [x] Build auth page (login/signup with role picker)
- [x] Set up role-based redirects (admin → /admin, seller → /dashboard, buyer → /buyer)

## Phase 4: Seller Store Setup ✅

- [x] Build store setup form (store name, slug, location, contact)
- [x] Build `useSeller` hook (CRUD for seller profile, products, orders, files)
- [x] Admin verification flow (submit → pending → approve/reject)
- [x] Verification status banner (pending/rejected states)

## Phase 5: AI Product Digitization ✅

- [x] Build `UploadZone` component (multi-file, compression to ~100KB)
- [x] Build `digitize` Supabase Edge Function (Gemini 2.5 Flash)
- [x] Build HITL ReviewCard (edit AI output before saving)
- [x] AI error handling (Zod validation, auto-retry, fallback)
- [x] Rate limiting (daily AI usage limit)

## Phase 6: Storefront ✅

- [x] Build public storefront page at `/store/:slug`
- [x] Product grid with stock badges
- [x] Buyer auth modal (name + phone or sign-in)
- [x] Order placement flow
- [x] Order confirmation modal
- [x] WhatsApp seller contact buttons

## Phase 7: Seller Dashboard ✅

- [x] Tab navigation (Products, Tools, Profile)
- [x] Product catalog with edit/delete
- [x] Order management with status transitions
- [x] Inventory editor (bulk stock updates)
- [x] Analytics (revenue, order volume, insights)
- [x] Store settings
- [x] Realtime order notifications (Supabase Realtime)

## Phase 8: Admin Dashboard ✅

- [x] Seller list with verification management
- [x] Platform-wide analytics
- [x] Feedback management with admin responses
- [x] User management

## Phase 9: i18n & Multi-language ✅

- [x] English translation (750+ keys)
- [x] Hindi translation (750+ keys)
- [x] Telugu translation (750+ keys)
- [x] Language switcher component
- [x] Language persistence (localStorage)

## Phase 10: WhatsApp Integration ✅

- [x] Direct seller contact via `wa.me` links on storefront
- [x] WhatsApp AI agent Edge Function (Claude + tools)
- [x] Conversation memory table (JSONB)
- [x] WhatsApp Cloud API webhook handler
- [x] Guest ordering via WhatsApp

## Phase 11: UI Polish ✅

- [x] Dark mode toggle
- [x] Responsive design (mobile bottom tabs, desktop header)
- [x] Loading skeletons
- [x] Empty states for all sections
- [x] Error boundaries
- [x] Toast notifications
- [x] Network strength indicator / offline banner
- [x] App tour for first-time users
- [x] Capacitor Android build

## Phase 12: Testing ✅

- [x] Vitest unit tests (components, hooks, utils)
- [x] AI accuracy evaluation benchmark (80% category accuracy)
- [x] Performance benchmarks (compression, upload, AI pipeline)

### Remaining Testing

- [ ] Playwright E2E tests for WhatsApp flow
- [ ] Load testing for Edge Functions

## Phase 13: WhatsApp Agent — Production Hardening ⏳

**Status: In Progress — Not Production Ready**

- [ ] Multi-store support (auto-detect store by WhatsApp number)
- [ ] Product image sharing via WhatsApp
- [ ] Order status notifications via WhatsApp
- [ ] Voice message support (transcription)
- [ ] Manual handoff (agent → human seller)
- [ ] Seller dashboard WhatsApp settings
- [ ] Rate limiting & spam protection
- [ ] Cost tracking per conversation

## Phase 14: FastAPI Backend Migration 🔮

**Status: Future Work — See [`docs/api.md`](../docs/api.md)**

- [ ] Phase 1: Scaffold + Auth (Week 1-2)
- [ ] Phase 2: Core CRUD (Week 3-4)
- [ ] Phase 3: AI + WhatsApp (Week 5-6)
- [ ] Phase 4: Admin + Analytics (Week 7-8)
- [ ] Phase 5: Frontend Migration (Week 9-10)

## Done Criteria

- All core flows work end-to-end: signup → store setup → product upload → storefront → order → fulfillment
- WhatsApp AI agent handles full sales cycle without human intervention
- Seller can onboard in under 2 minutes
- All UI available in English, Hindi, and Telugu
- FastAPI backend replaces all direct Supabase client calls from frontend
- Test coverage > 80% for critical paths
- Zero security vulnerabilities (RLS, JWT, service role key protection)
