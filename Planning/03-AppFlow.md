# Document 03 — App Flow: Navigation & User Journey Map

---

## Pages List

| Path | Page | Access |
|------|------|--------|
| `/` | Landing page | Public |
| `/auth` | Login / Sign-up | Public |
| `/dashboard` | Seller dashboard | 🔒 Seller |
| `/admin` | Admin dashboard | 🔒 Admin |
| `/buyer` | Buyer dashboard | 🔒 Buyer |
| `/store/:slug` | Public storefront | Public |
| `/track-order/:orderId` | Order tracking | 🔒 Buyer |
| `/reset-password` | Password reset | Public |
| `*` | 404 Not Found | Public |

## Navigation Type

- **Desktop:** Top navbar with tab navigation (Products, Tools, Profile) inside dashboard
- **Mobile:** Bottom tab navigation (Products, Tools, Profile) with Capacitor back-button handling
- **Public storefront:** Minimal layout, product grid, sticky header

## First Screen

A brand-new visitor sees the **Landing page** (`/`) — app description, feature highlights, and a "Get Started" button that leads to `/auth`.

## Auth Flow

1. User visits `/auth`
2. Signs up with email + password + role (seller/buyer)
3. Email verification (optional via Supabase)
4. Seller: redirected to `/dashboard` → store setup flow
5. Buyer: redirected to `/buyer` → empty dashboard
6. Unapproved seller sees verification pending banner — limited access

## Core User Journey 1: Seller Onboarding + Product Upload

1. Seller signs up → lands on `/dashboard`
2. Sees store setup form (store name, slug, location, contact)
3. Submits for admin verification
4. Admin approves → seller gets full access
5. Seller goes to Tools → Upload tab
6. Selects product images (multi-file) → auto-compressed to ~100KB
7. Images uploaded → AI digitize edge function runs Gemini
8. Review card appears with extracted title, description, price, category
9. Seller edits if needed → approves → product saved
10. Product appears in dashboard catalog and public storefront

## Core User Journey 2: Buyer Order Flow

1. Buyer visits `/store/:slug` (shared link from seller)
2. Browses products with stock badges
3. Clicks "Order Now" → BuyerAuthModal (name + phone or sign-in)
4. Places order → OrderConfirmation modal with details
5. Seller gets realtime notification in Dashboard Orders tab
6. Seller confirms order → stock decrements automatically
7. Buyer tracks on `/track-order/:orderId`
8. Buyer can contact seller on WhatsApp from product card

## Core User Journey 3: WhatsApp AI Agent (Future)

1. Customer messages seller's WhatsApp number
2. AI agent responds, shows products, takes order
3. Order written to DB as guest order (buyer_id = null)
4. Seller sees WhatsApp order in dashboard orders tab
5. UPI payment link sent to customer

## Empty States

- **No products yet:** Dashed border box with "Upload your first product" CTA
- **No orders yet:** "No orders received" message in orders tab
- **No store setup:** Full-screen store setup form on dashboard

## Error States

- **Upload failure:** Toast notification with error details
- **AI extraction failed:** Retry button on failed items
- **Network offline:** OfflineBanner component at top
- **404:** Custom Not Found page with link back to home

## Redirects

- After login → `/dashboard` (seller), `/buyer` (buyer), `/admin` (admin)
- After logout → `/`
- Unapproved seller → `/dashboard` (restricted, sees verification banner)
- Non-existent store slug → 404 page
- Unauthenticated access to protected routes → `/auth`
