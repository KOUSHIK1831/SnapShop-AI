# WhatsApp AI Agent — Implementation Plan

> **Status: 🔄 Coming Soon — Future Work**
> **Stage: Alpha / Working in Progress — NOT READY FOR PRODUCTION**

---

## Overview

An autonomous AI-powered sales agent that runs on WhatsApp for sellers on SnapShop AI. Handles the complete sales lifecycle — product discovery, order taking, language switching, and UPI payment collection.

---

## Status

| Aspect               | Status                     |
| -------------------- | -------------------------- |
| Edge Function        | ✅ Deployed (WIP)          |
| AI Model             | ✅ Claude integration done |
| Conversation         | ✅ Memory table exists     |
| WhatsApp API         | ✅ Webhook handler         |
| **Production Ready** | ❌ **NOT YET**             |

---

## Implementation Phases

### Phase 1: Core Agent (In Progress)

- [x] Edge function scaffold
- [x] Claude integration (tool calling)
- [x] Conversation memory (PostgreSQL JSONB)
- [x] WhatsApp Cloud API webhook
- [x] Basic tools: `get_products`, `place_order`, `get_datetime`, `generate_upi_payment`
- [ ] System prompt refinement
- [ ] Multi-language detection improvements
- [ ] Error handling & retry logic

### Phase 2: Enhanced Capabilities (Planned)

- [ ] Multi-store support (auto-detect store by WhatsApp number)
- [ ] Product image sharing via WhatsApp
- [ ] Order status notifications
- [ ] Voice message support (transcription)
- [ ] Discount & coupon code handling
- [ ] Abandoned cart recovery

### Phase 3: Seller Dashboard Integration (Planned)

- [ ] WhatsApp conversation log viewer
- [ ] Manual handoff (agent → human seller)
- [ ] Agent analytics (conversations, orders, revenue)
- [ ] Customizable agent personality & tone
- [ ] Blacklist/block management

### Phase 4: Production Hardening (Future)

- [ ] Rate limiting & spam protection
- [ ] Sentiment analysis & escalation
- [ ] A/B testing for prompts
- [ ] Cost tracking per conversation
- [ ] Full test coverage
- [ ] Load testing

---

## Architecture

```
Customer's Phone
  ┌──────────────┐
  │   WhatsApp   │  "hi, what do you have?"
  └──────┬───────┘
         │ HTTPS POST
         ▼
Meta Cloud API (graph.facebook.com/v25.0)
         │ POST /functions/v1/whatsapp-agent
         ▼
Supabase Edge Function (Deno)
  ┌─────────────────────────────────────┐
  │ 1. Verify message                    │
  │ 2. Extract phone + text              │
  │ 3. Load conversation history         │
  │ 4. Agentic Loop (Claude + tools)     │
  │ 5. Save history                      │
  │ 6. Send reply via WhatsApp API       │
  └─────────────────────────────────────┘
         │
         ▼
Supabase DB (products, orders, conversations)
```

---

## Agent Tools

| Tool                   | Purpose                           |
| ---------------------- | --------------------------------- |
| `get_products`         | Fetch live product catalog        |
| `place_order`          | Insert order (guest, no buyer_id) |
| `get_datetime`         | Get current IST datetime          |
| `generate_upi_payment` | Create UPI deep link              |

---

## Conversation Memory

Stored in `public.conversations` table:

- `phone` + `store_slug` unique key
- JSONB `messages[]` array (last 30 messages)
- Auto-updated `updated_at` timestamp

---

## Deployment

```bash
supabase functions deploy whatsapp-agent
supabase secrets set ANTHROPIC_API_KEY=sk-...
supabase secrets set WHATSAPP_TOKEN=EAAR...
supabase secrets set PHONE_NUMBER_ID=123456...
supabase secrets set VERIFY_TOKEN=my_verify_token
supabase secrets set STORE_SLUG=my-store
```

---

## Next Steps

1. Add proper TypeScript types for all tool inputs/outputs
2. Write unit tests for the agentic loop
3. Add input sanitization & validation
4. Implement per-seller webhook routing
5. Add monitoring & logging
6. Create seller dashboard UI for WhatsApp settings
