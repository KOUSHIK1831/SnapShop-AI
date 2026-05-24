# WhatsApp AI Sales Agent

An autonomous AI-powered sales agent that runs on WhatsApp for sellers on ApnaBazar. Handles the complete sales lifecycle — product discovery, order taking, language switching, and UPI payment collection — without any human in the loop.

Each seller gets their own WhatsApp Business number. Customers message that number and the AI agent responds as if it were the seller's personal sales assistant, reading from that seller's product catalog and writing orders into the existing `orders` table.

---

## Status

- **Edge function deployed:** `supabase/functions/whatsapp-agent/index.ts` (398 lines)
- **Used by:** WhatsApp Cloud API webhook
- **AI Model:** Anthropic Claude (claude-opus-4-5)
- **Conversation memory:** `conversations` table (JSONB)

---

## What the Agent Can Do

| Capability | Description |
|---|---|
| Greet customers | Warm welcome message with store name on first contact |
| Show product catalog | Fetches live products from Supabase, formats for WhatsApp |
| Product recommendations | Suggests products based on occasion, budget, preference |
| Complete order flow | Product → quantity → name → address → delivery date → summary → confirm |
| Multi-language support | Detects customer's language (Hindi, English, Tamil, Telugu, Bengali) and replies in the same language |
| Price objection handling | Can offer up to 5% discount if customer insists |
| FAQ answering | Delivery areas, timings, payment methods — all from system prompt |
| Order summary generation | Clean formatted summary before confirmation |
| UPI payment link | Generates `upi://pay?pa=...` deep link after order confirmation |
| Conversation memory | Remembers context across messages using `conversations` table |
| Guest ordering | No account needed — buyer just needs WhatsApp |

---

## Tech Stack

| Tool | Purpose |
|---|---|
| **Anthropic Claude (claude-opus-4-5)** | AI brain — powers all conversations |
| **Supabase Edge Functions (Deno)** | Webhook server — receives WhatsApp messages |
| **Meta WhatsApp Cloud API** | Customer-facing interface |
| **Supabase PostgreSQL** | Product catalog + order storage + conversation memory |
| **`conversations` table (JSONB)** | Conversation memory per phone number |

---

## System Architecture

```
Customer's Phone
  ┌──────────────┐
  │   WhatsApp   │  "hi, what do you have?"
  └──────┬───────┘
         │ HTTPS POST (message payload)
         ▼
Meta Cloud API
  graph.facebook.com/v25.0/{PHONE_NUMBER_ID}/messages
         │ POST /functions/v1/whatsapp-agent
         ▼
Supabase Edge Function
  supabase/functions/whatsapp-agent/index.ts

  Step 1: Verify it's a real message (not a status update)
  Step 2: Extract phone number + message text
  Step 3: Load conversation history from conversations table
  Step 4: Append user message to history
  Step 5: Run Agentic Loop (see below)
  Step 6: Save updated history back to conversations table
  Step 7: Send reply via Meta Cloud API
  Step 8: Return HTTP 200 to Meta

  ┌───────────────────────────────────────────────┐
  │               AGENTIC LOOP                    │
  │                                               │
  │   Call Claude with:                           │
  │   - system prompt (store rules, sales flow)   │
  │   - tools (get_products, place_order, etc.)   │
  │   - full conversation history                 │
  │                                               │
  │   Claude response                             │
  │     ├── stop_reason = "end_turn"              │
  │     │     └── Extract text reply → exit loop  │
  │     └── stop_reason = "tool_use"              │
  │           └── Process each tool call          │
  │           └── Append tool results to history  │
  │           └── Call Claude again with results  │
  │           └── Repeat until end_turn (max 10)  │
  └───────────────────────────────────────────────┘
         │ Tool calls read/write Supabase DB
         ▼
Supabase Database
  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
  │    sellers      │  │    products     │  │       orders        │
  │  store_name     │  │  title, price   │  │  seller_id          │
  │  store_slug     │  │  description    │  │  product_id         │
  │  contact_number │  │  category,stock │  │  buyer_name/phone   │
  └─────────────────┘  └─────────────────┘  │  quantity, status   │
                                            └─────────────────────┘
  ┌──────────────────────────────────────────┐
  │           conversations  (JSONB)         │
  │  phone, store_slug, messages[], updated │
  │  UNIQUE (phone, store_slug)             │
  └──────────────────────────────────────────┘
         │ Order written → seller sees it immediately
         ▼
Seller Dashboard — Orders Tab
  New WhatsApp order appears in real-time
  Seller confirms → status: pending → confirmed → completed
```

---

## The 4 Tools Claude Can Call

### Tool 1: `get_products`
- **When:** Customer asks "what do you have?", "show me menu", etc.
- **Input:** `{ store_slug: string }`
- **DB query:** `SELECT id, title, price, description, category, stock FROM products WHERE seller_id = (SELECT id FROM sellers WHERE store_slug = ?) AND stock > 0 ORDER BY created_at DESC`
- **Key rule:** Claude NEVER makes up products — always calls this tool first

### Tool 2: `place_order`
- **When:** Customer confirms after seeing the order summary
- **Input:** `{ store_slug, product_id, buyer_name, quantity }`
- **DB query:** `INSERT INTO orders (seller_id, product_id, buyer_phone, buyer_name, quantity, status) VALUES (?, ?, ?, ?, ?, 'pending')`
- **Note:** `buyer_id` is NULL — guest order via WhatsApp

### Tool 3: `get_datetime`
- **When:** Customer asks about delivery timing
- **Input:** `{}`
- **Output:** "Monday, 20 January 2026, 02:30 PM IST"

### Tool 4: `generate_upi_payment`
- **When:** After place_order succeeds
- **Input:** `{ amount: number, note: string }`
- **Output:** `upi://pay?pa=seller@upi&am=500&tn=Order%20abc123&cu=INR`

---

## Conversation Memory Design

Conversation history is stored as a JSONB array in the `conversations` table:

```sql
CREATE TABLE public.conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT NOT NULL,
  store_slug TEXT NOT NULL,
  messages   JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (phone, store_slug)
);
```

**Flow for every incoming message:**
1. Receive message from phone for a store
2. `SELECT messages FROM conversations WHERE phone = ? AND store_slug = ?`
3. Append new user message to the array
4. Pass full messages array to Claude
5. Claude responds (possibly calling tools)
6. Append assistant response
7. `UPSERT` with trimmed last 30 messages

---

## System Prompt Design

Built dynamically per store using the seller's `store_name` and `store_slug`:

1. **Role definition** — "You are a friendly AI sales agent for {storeName} on WhatsApp."
2. **Responsibilities** — Show products, take orders, answer FAQs
3. **Strict order flow sequence** — Greet → ask → show products → confirm → place order → payment
4. **Language detection** — "Detect the customer's language from their first message. Reply in the EXACT same language."
5. **Discount policy** — Up to 5% if customer insists
6. **WhatsApp formatting** — *bold* for names/prices, • for bullets, max 3-4 lines, no markdown headers
7. **Delivery rules** — Same day if before 2 PM IST, next day otherwise
8. **Fallback** — "Let me check with the store team and get back to you!"

Products are NEVER hardcoded in the system prompt. Claude always calls `get_products` tool — the catalog is always live.

---

## Example Conversation

```
Customer:  "hi"
Agent:     "Welcome to *Priya's Boutique*! 👋
            I'm your AI shopping assistant.
            What are you looking for today?"

Customer:  "saree dikhao"
           [Agent detects Hindi → switches to Hindi]
           [Agent calls get_products → fetches live catalog]

Agent:     "Bilkul! 😊 Yeh hamare sarees hain:
            • *Banarasi Silk Saree* — ₹2,500
            • *Cotton Printed Saree* — ₹850
            • *Georgette Party Saree* — ₹1,800
            Kaunsa pasand aaya?"

Customer:  "banarasi wala, price thoda kam hoga?"
Agent:     "Banarasi Silk Saree ki quality bahut achhi hai! 🌟
            Aapke liye special price ₹2,375 kar sakti hoon (5% off).
            Lena hai?"

Customer:  "theek hai, 1 chahiye"
Agent:     "Aapka naam kya hai?"

Customer:  "Sunita Sharma"
Agent:     "Delivery chahiye ya pickup?"

Customer:  "delivery"
Agent:     "Address batayein please 📍"

Customer:  "123 MG Road, Bangalore 560001"
Agent:     "Kab chahiye? Date aur time batayein"

Customer:  "kal subah 10 baje"
           [Agent calls get_datetime → confirms tomorrow's date]

Agent:     "📋 *Order Summary*
            • Product: Banarasi Silk Saree
            • Quantity: 1
            • Price: ₹2,375
            • Name: Sunita Sharma
            • Address: 123 MG Road, Bangalore 560001
            • Delivery: 21 Jan, 10:00 AM
            Confirm karna hai? *YES* likhein ✅"

Customer:  "YES"
           [Agent calls place_order → order inserted]
           [Agent calls generate_upi_payment → UPI link]

Agent:     "✅ Order confirm ho gaya! Order ID: ORD-abc123
            Payment ke liye yeh link tap karein:
            upi://pay?pa=priya@upi&am=2375&tn=Order%20ORD-abc123&cu=INR
            Kal subah 10 baje delivery hogi! 🚚
            Shukriya Sunita ji! 🙏"
```
