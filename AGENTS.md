# AI Agents in SnapShop AI

This document describes the AI agents and models integrated into the SnapShop AI ecosystem.

## 1. Inventory Digitization Agent

- **Purpose**: To convert physical catalogs, handwritten price lists, or product photos into digital database entries.
- **Tech Stack**: Supabase Edge Functions + AI Vision models.
- **Location**: `supabase/functions/digitize/`

## 2. WhatsApp Business Agent

- **Purpose**: To handle customer inquiries, order tracking, and automated seller notifications via WhatsApp.
- **Tech Stack**: Meta WhatsApp Cloud API + Supabase Edge Functions.
- **Location**: `supabase/functions/whatsapp-agent/`

## 3. Local Language Processing (LLP)

- **Purpose**: To provide accurate translations and transliterations for regional languages (Telugu, Hindi).
- **Tech Stack**: Custom i18n logic + AI Translation APIs.

---

_For development details, refer to `CONTRIBUTING.md`._
