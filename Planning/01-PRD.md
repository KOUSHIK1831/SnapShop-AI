# Document 01 — PRD: Product Requirements Document

---

**App Name:** SnapShop AI
**Tagline:** Digitize Your Store — AI-powered digitization platform for local clothing sellers.
**Status:** ✅ Completed — **SnapShop AI**

---

## Problem

Small retail clothing sellers in India (tier-2/3 cities, local markets) have physical inventory but no digital presence. They lose customers to online-first competitors. Manually listing products on existing e-commerce platforms is slow, technical, and doesn't reflect their local inventory.

## Target User

Local clothing store owners in India — typically not tech-savvy, comfortable with WhatsApp and basic smartphone use. They have 50–500+ products in their shop and want a simple way to show them online without spending hours typing descriptions and prices.

## Core Features (Must Have)

- Upload product photos → AI auto-extracts title, description, price, category
- Human-in-the-loop review before saving
- Instant public storefront page per seller (`/store/:slug`)
- Order management (pending → confirmed → completed/cancelled)
- Stock tracking with low-stock alerts
- Role-based access (Admin, Seller, Buyer)
- Multi-language support (English, Hindi, Telugu)
- WhatsApp integration (direct seller contact + AI sales agent)
- Seller dashboard with analytics
- Admin dashboard for platform management

## Nice to Have

- Mobile app (Android via Capacitor)
- WhatsApp AI sales agent (autonomous ordering via chat)
- UPI payment link generation
- AI accuracy evaluation benchmarks
- Dark mode

## Out of Scope

- Payment processing (UPI links generated but no payment confirmation webhook)
- Shipping/logistics integration
- Multi-store management for single sellers
- iOS app (Android only for now)

## User Stories

- As a seller, I want to upload product photos so that AI extracts the details automatically.
- As a seller, I want to review and edit AI-extracted data before saving.
- As a seller, I want a public storefront link to share with customers.
- As a buyer, I want to browse products and place orders without creating an account.
- As a buyer, I want to contact the seller on WhatsApp directly.
- As an admin, I want to verify seller accounts before they go live.
- As a seller, I want to see analytics of my orders and revenue.

## Success Metrics

- Seller onboarding time < 2 minutes (from signup to first product)
- AI category accuracy > 80%
- Storefront load time < 2s
- Zero manual data entry for product listings
- WhatsApp AI agent handles > 50% of customer inquiries without human handoff
