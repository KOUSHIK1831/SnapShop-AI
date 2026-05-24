# API Endpoints Reference

## Supabase Project

- **URL:** `https://ucfdhntlnszfcowhkthy.supabase.co`
- **Anon Key:** via `VITE_SUPABASE_PUBLISHABLE_KEY` (`.env.example`)

---

## 1. Supabase Auth API (5 calls)

All in `src/hooks/useAuth.tsx`

| #   | Method   | Endpoint                                                | Location         | Description                                   |
| --- | -------- | ------------------------------------------------------- | ---------------- | --------------------------------------------- |
| 1   | Listener | `supabase.auth.onAuthStateChange(callback)`             | `useAuth.tsx:22` | Listens for auth state changes (login/logout) |
| 2   | Query    | `supabase.auth.getSession()`                            | `useAuth.tsx:28` | Gets current session on mount                 |
| 3   | Mutation | `supabase.auth.signUp({ email, password, options })`    | `useAuth.tsx:38` | Creates new user account                      |
| 4   | Mutation | `supabase.auth.signInWithPassword({ email, password })` | `useAuth.tsx:47` | Signs in existing user                        |
| 5   | Mutation | `supabase.auth.signOut()`                               | `useAuth.tsx:52` | Signs out current user                        |

---

## 2. Supabase Database REST API (16 calls)

### Table: `sellers` (5 calls)

| #   | Method                    | Filter                             | Location                | Description                                                      |
| --- | ------------------------- | ---------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| 1   | `select('*')`             | `.eq('user_id', user.id).single()` | `useSeller.tsx:64-68`   | Get seller profile by auth user ID                               |
| 2   | `upsert(payload)`         | `{ onConflict: 'user_id' }`        | `useSeller.tsx:124-126` | Create/update seller profile                                     |
| 3   | `update(safeUpdates)`     | `.eq('id', seller.id)`             | `useSeller.tsx:147-150` | Update base columns (name, store, slug, location, phone)         |
| 4   | `update(extendedUpdates)` | `.eq('id', seller.id)`             | `useSeller.tsx:160`     | Update extended columns (contact_number, store_number, maps_url) |
| 5   | `select('*')`             | `.eq('store_slug', slug).single()` | `Storefront.tsx:34-38`  | Lookup seller by store slug (public)                             |

### Table: `products` (5 calls)

| #   | Method                                                                        | Filter                                                                      | Location                 | Description                              |
| --- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------ | ---------------------------------------- |
| 1   | `select('*')`                                                                 | `.eq('seller_id', seller.id).order('created_at', { ascending: false })`     | `useSeller.tsx:74-78`    | Get all products for dashboard           |
| 2   | `update(updates)`                                                             | `.eq('id', productId)`                                                      | `useSeller.tsx:167-171`  | Edit product title/price/description     |
| 3   | `delete()`                                                                    | `.eq('id', productId)`                                                      | `useSeller.tsx:177-180`  | Remove a product                         |
| 4   | `select('*')`                                                                 | `.eq('seller_id', sellerData.id).order('created_at', { ascending: false })` | `Storefront.tsx:48-52`   | Get all products for storefront (public) |
| 5   | `insert({ seller_id, title, description, price, category, tags, image_url })` | —                                                                           | `UploadZone.tsx:126-134` | Create product from AI extraction result |

### Table: `files` (5 calls)

| #   | Method                                               | Filter                                                                  | Location               | Description                         |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------- | ----------------------------------- |
| 1   | `select('*')`                                        | `.eq('seller_id', seller.id).order('created_at', { ascending: false })` | `useSeller.tsx:84-88`  | Get all uploaded files              |
| 2   | `insert({ seller_id, file_url, file_type, status })` | —                                                                       | `UploadZone.tsx:75-84` | Track uploaded file                 |
| 3   | `update({ status: 'processing' })`                   | `.eq('id', fileId)`                                                     | `UploadZone.tsx:114`   | Mark file as being processed        |
| 4   | `update({ status: 'completed' })`                    | `.eq('id', fileId)`                                                     | `UploadZone.tsx:146`   | Mark file as successfully processed |
| 5   | `update({ status: 'failed' })`                       | `.eq('id', fileId)`                                                     | `UploadZone.tsx:150`   | Mark file as failed                 |

### Table: `orders` (4 calls)

| #   | Method                                                                                   | Filter                                                                  | Location                        | Description                                                 |
| --- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| 1   | `select('*, product:products(*)')`                                                       | `.eq('seller_id', seller.id).order('created_at', { ascending: false })` | `useSeller.tsx:94-98`           | Get all orders with joined product data                     |
| 2   | `update({ status })`                                                                     | `.eq('id', orderId)`                                                    | `useSeller.tsx:103-106`         | Update order status (pending→confirmed→completed/cancelled) |
| 3   | `insert({ buyer_id, seller_id, product_id, quantity, status, buyer_name, buyer_phone })` | —                                                                       | `Storefront.tsx:94-102`         | Place new order                                             |
| 4   | `insert({ seller_id, product_id, buyer_phone, buyer_name, quantity, status })`           | —                                                                       | `whatsapp-agent/index.ts:79-94` | Place order via WhatsApp agent (guest, buyer_id = null)     |

### Table: `conversations` (2 calls)

| #   | Method                                    | Filter                                                     | Location                        | Description                                  |
| --- | ----------------------------------------- | ---------------------------------------------------------- | ------------------------------- | -------------------------------------------- |
| 1   | `select('messages')`                      | `.eq('phone', phone).eq('store_slug', storeSlug).single()` | `whatsapp-agent/index.ts:29-36` | Load WhatsApp conversation history (JSONB)   |
| 2   | `upsert({ phone, store_slug, messages })` | `{ onConflict: 'phone,store_slug' }`                       | `whatsapp-agent/index.ts:39-46` | Save conversation history (last 30 messages) |

---

## 3. Supabase Storage API (2 calls)

All in `src/components/UploadZone.tsx`

| #   | Method                                                | Parameters                                           | Location               | Description                        |
| --- | ----------------------------------------------------- | ---------------------------------------------------- | ---------------------- | ---------------------------------- |
| 1   | `supabase.storage.from('uploads').upload(path, file)` | `path = "${sellerId}/${timestamp}-${random}.${ext}"` | `UploadZone.tsx:59-61` | Upload compressed image to storage |
| 2   | `supabase.storage.from('uploads').getPublicUrl(path)` | `path` from upload                                   | `UploadZone.tsx:73`    | Get public URL of uploaded file    |

**Storage bucket:** `uploads` (public)

---

## 4. Supabase Edge Functions (2 invocations)

| Function         | Trigger                         | Request Body / Webhook                                                  | Location                           | Description                                                          |
| ---------------- | ------------------------------- | ----------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `digitize`       | After file upload success       | `{ imageUrl: string, sellerId: string }`                                | `UploadZone.tsx:116`               | Invokes AI (Gemini 2.5 Flash) to extract product metadata from image |
| `whatsapp-agent` | WhatsApp Cloud API webhook POST | `{ entry: [{ changes: [{ value: { messages: [{ from, text }] } }] }] }` | WhatsApp Cloud API → Edge Function | AI sales agent (Claude) handling WhatsApp conversations              |

**Edge Function files:**

- `supabase/functions/digitize/index.ts` (131 lines)
- `supabase/functions/whatsapp-agent/index.ts` (398 lines)

---

## 5. External API Calls

### Digitize Edge Function (`supabase/functions/digitize/index.ts`)

| #   | Endpoint                                                  | Method | Purpose                                           | Location                  |
| --- | --------------------------------------------------------- | ------ | ------------------------------------------------- | ------------------------- |
| 1   | `fetch(imageUrl)`                                         | GET    | Fetch uploaded product image to convert to base64 | `digitize/index.ts:30`    |
| 2   | `POST https://ai.gateway.lovable.dev/v1/chat/completions` | POST   | Send base64 image to Gemini 2.5 Flash             | `digitize/index.ts:41-42` |

**AI Model:** `google/gemini-2.5-flash`
**Auth:** `Bearer ${LOVABLE_API_KEY}` (via environment variable)

### WhatsApp Agent Edge Function (`supabase/functions/whatsapp-agent/index.ts`)

| #   | Endpoint                                                           | Method | Purpose                                         | Location                          |
| --- | ------------------------------------------------------------------ | ------ | ----------------------------------------------- | --------------------------------- |
| 3   | `POST https://graph.facebook.com/v25.0/{PHONE_NUMBER_ID}/messages` | POST   | Send reply text back to customer on WhatsApp    | `whatsapp-agent/index.ts:308-323` |
| 4   | `POST https://api.anthropic.com/v1/messages` (via Anthropic SDK)   | POST   | Call Claude AI for conversation + tool handling | `whatsapp-agent/index.ts:245-253` |

**WhatsApp API Auth:** `Bearer ${WHATSAPP_TOKEN}` (via environment variable)
**Claude Model:** `claude-opus-4-5`
**Claude Auth:** `${ANTHROPIC_API_KEY}` (via environment variable)

---

## Summary

| Category                  | Count                                                              |
| ------------------------- | ------------------------------------------------------------------ |
| Auth API calls            | 5                                                                  |
| Database REST calls       | 20 (5 sellers + 5 products + 5 files + 4 orders + 2 conversations) |
| Storage API calls         | 2                                                                  |
| Edge Function invocations | 2 (digitize + whatsapp-agent)                                      |
| External API calls        | 4 (Gemini + Claude + WhatsApp + image fetch)                       |
| **Total**                 | **33**                                                             |
