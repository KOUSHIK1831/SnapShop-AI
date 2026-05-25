# Full Migration Plan — FastAPI Backend

> **Status: Future Work — High-Level Architecture Plan**
> This document outlines the complete migration from Supabase Edge Functions + frontend-direct DB access to a proper FastAPI backend for production scaling.

---

## Why FastAPI?

| Current (Frontend → Supabase Direct) | Target (Frontend → FastAPI → Supabase) |
|--------------------------------------|----------------------------------------|
| Business logic in frontend hooks      | Centralized business logic in API layer |
| RLS policies for auth                 | JWT verification + middleware           |
| Edge Functions for AI/WhatsApp        | Unified Python backend                  |
| No API documentation                  | Auto-generated OpenAPI/Swagger docs     |
| Difficult to test                     | Easy pytest integration                 |
| Vendor-locked to Supabase             | Abstracted database layer               |

---

## Architecture

```
React Frontend
     │
     │ HTTPS + JWT Bearer Token
     ▼
FastAPI Backend (Python)
  ┌──────────────────────────────────────┐
  │  Middleware:                          │
  │  • CORS (permissive for frontend)     │
  │  • JWT Auth verification              │
  │  • Rate limiting                      │
  │  • Request logging                    │
  ├──────────────────────────────────────┤
  │  Routers:                             │
  │  ├── /api/v1/auth/*                   │
  │  ├── /api/v1/sellers/*                │
  │  ├── /api/v1/products/*               │
  │  ├── /api/v1/orders/*                 │
  │  ├── /api/v1/files/*                  │
  │  ├── /api/v1/conversations/*          │
  │  ├── /api/v1/whatsapp/*               │
  │  ├── /api/v1/admin/*                  │
  │  └── /api/v1/digitize/*               │
  ├──────────────────────────────────────┤
  │  Services:                            │
  │  • Auth service (Supabase Auth)       │
  │  • Seller service                     │
  │  • Product service                    │
  │  • Order service                      │
  │  • File service (Supabase Storage)    │
  │  • WhatsApp service                   │
  │  • AI service (Gemini, Claude)        │
  │  • Analytics service                  │
  ├──────────────────────────────────────┤
  │  Models (Pydantic):                   │
  │  • Request/Response schemas           │
  │  • DB models (SQLAlchemy)             │
  │  • Tool schemas (WhatsApp agent)      │
  └──────────────────────────────────────┘
     │
     ▼
Supabase (PostgreSQL + Storage)
```

---

## Directory Structure

```
snapshop-backend/
├── .env                        # Environment variables
├── requirements.txt            # Python dependencies
├── alembic.ini                 # DB migration config
├── app/
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Settings / env loading
│   ├── database.py             # Supabase/SQLAlchemy client
│   ├── middleware/
│   │   ├── auth.py             # JWT verification middleware
│   │   ├── cors.py             # CORS configuration
│   │   └── logging.py          # Request/response logging
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py             # User/seller Pydantic schemas
│   │   ├── product.py          # Product schemas
│   │   ├── order.py            # Order schemas
│   │   ├── file.py             # File schemas
│   │   ├── conversation.py     # WhatsApp conversation schemas
│   │   └── whatsapp.py         # WhatsApp agent tool schemas
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py             # Auth endpoints
│   │   ├── sellers.py          # Seller CRUD
│   │   ├── products.py         # Product CRUD
│   │   ├── orders.py           # Order management
│   │   ├── files.py            # File upload/management
│   │   ├── conversations.py    # WhatsApp conversation history
│   │   ├── whatsapp.py         # WhatsApp webhook + agent
│   │   ├── admin.py            # Admin endpoints
│   │   ├── digitize.py         # AI product digitization
│   │   └── analytics.py        # Dashboard analytics
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py         # Supabase Auth integration
│   │   ├── seller_service.py       # Seller business logic
│   │   ├── product_service.py      # Product business logic
│   │   ├── order_service.py        # Order lifecycle
│   │   ├── file_service.py         # Supabase Storage
│   │   ├── whatsapp_service.py     # WhatsApp Cloud API + agent loop
│   │   ├── ai_service.py           # Gemini + Claude AI calls
│   │   └── analytics_service.py    # Dashboard metrics
│   └── utils/
│       ├── __init__.py
│       ├── supabase.py         # Supabase client wrapper
│       ├── supabase_storage.py # Storage client wrapper
│       └── helpers.py          # Shared utilities
└── tests/
    ├── conftest.py             # Fixtures
    ├── test_auth.py
    ├── test_sellers.py
    ├── test_products.py
    ├── test_orders.py
    ├── test_files.py
    ├── test_whatsapp.py
    ├── test_digitize.py
    └── test_admin.py
```

---

## API Endpoints — Complete Specification

All endpoints prefixed with `/api/v1`.

### 1. Auth (`/api/v1/auth`)

| Method | Endpoint                 | Description                 | JWT  | Supabase Equivalent                          |
| ------ | ------------------------ | --------------------------- | ---- | -------------------------------------------- |
| POST   | `/auth/signup`           | Create new user account     | No   | `supabase.auth.signUp()`                     |
| POST   | `/auth/login`            | Sign in with email/password | No   | `supabase.auth.signInWithPassword()`         |
| POST   | `/auth/logout`           | Sign out current session    | Yes  | `supabase.auth.signOut()`                    |
| GET    | `/auth/session`          | Get current session         | Yes  | `supabase.auth.getSession()`                 |
| POST   | `/auth/reset-password`   | Request password reset      | No   | `supabase.auth.resetPasswordEmail()`         |
| POST   | `/auth/refresh`          | Refresh JWT token           | No   | `supabase.auth.refreshSession()`             |

### 2. Sellers (`/api/v1/sellers`)

| Method | Endpoint               | Description                     | JWT  | Role     | Supabase Equivalent                          |
| ------ | ---------------------- | ------------------------------- | ---- | -------- | -------------------------------------------- |
| GET    | `/sellers/me`          | Get own seller profile          | Yes  | Seller   | `sellers.select('*').eq('user_id', user.id)` |
| POST   | `/sellers/me`          | Create seller profile           | Yes  | Seller   | `sellers.upsert(payload)`                    |
| PATCH  | `/sellers/me`          | Update seller profile           | Yes  | Seller   | `sellers.update(data).eq('id', seller.id)`   |
| GET    | `/sellers/{slug}`      | Get seller by store slug (public) | No | Public   | `sellers.select('*').eq('store_slug', slug)` |
| POST   | `/sellers/me/submit`   | Submit for verification         | Yes  | Seller   | —                                            |

### 3. Products (`/api/v1/products`)

| Method | Endpoint                      | Description                        | JWT  | Role     | Supabase Equivalent                                       |
| ------ | ----------------------------- | ---------------------------------- | ---- | -------- | --------------------------------------------------------- |
| GET    | `/products`                   | List own products (dashboard)      | Yes  | Seller   | `products.select('*').eq('seller_id', id)`                |
| GET    | `/products/{id}`              | Get single product                 | Yes  | Seller   | `products.select('*').eq('id', id)`                       |
| POST   | `/products`                   | Create product                     | Yes  | Seller   | `products.insert({...})`                                  |
| PATCH  | `/products/{id}`              | Update product                     | Yes  | Seller   | `products.update(data).eq('id', id)`                      |
| DELETE | `/products/{id}`              | Delete product                     | Yes  | Seller   | `products.delete().eq('id', id)`                          |
| GET    | `/sellers/{slug}/products`    | List products for storefront (public) | No | Public   | `products.select('*').eq('seller_id', id)`                |

### 4. Orders (`/api/v1/orders`)

| Method | Endpoint                      | Description                          | JWT  | Role     | Supabase Equivalent                                 |
| ------ | ----------------------------- | ------------------------------------ | ---- | -------- | --------------------------------------------------- |
| GET    | `/orders`                     | List own orders (seller)             | Yes  | Seller   | `orders.select('*').eq('seller_id', id)`            |
| POST   | `/orders`                     | Place new order (buyer)              | Yes  | Buyer    | `orders.insert({...})`                              |
| PATCH  | `/orders/{id}/status`         | Update order status                  | Yes  | Seller   | `orders.update({status}).eq('id', id)`              |
| GET    | `/orders/{id}`                | Track order by ID (public)           | No   | Public   | `orders.select('*').eq('id', id)`                   |
| GET    | `/orders/buyer`               | List buyer's orders                  | Yes  | Buyer    | `orders.select('*').eq('buyer_id', id)`             |

### 5. Files (`/api/v1/files`)

| Method | Endpoint           | Description                    | JWT  | Role     | Supabase Equivalent                               |
| ------ | ------------------ | ------------------------------ | ---- | -------- | ------------------------------------------------- |
| POST   | `/files/upload`    | Upload image to storage        | Yes  | Seller   | `storage.from('uploads').upload(path, file)`      |
| GET    | `/files`           | List own uploaded files        | Yes  | Seller   | `files.select('*').eq('seller_id', id)`           |
| POST   | `/files`           | Create file record             | Yes  | Seller   | `files.insert({...})`                             |
| PATCH  | `/files/{id}`      | Update file status             | Yes  | Seller   | `files.update({status}).eq('id', id)`             |
| GET    | `/files/{id}/url`  | Get public URL of file         | Yes  | Seller   | `storage.from('uploads').getPublicUrl(path)`      |

### 6. Conversations (`/api/v1/conversations`)

| Method | Endpoint                              | Description                              | JWT  | Role     |
| ------ | ------------------------------------- | ---------------------------------------- | ---- | -------- |
| GET    | `/conversations`                      | List all conversations for seller        | Yes  | Seller   |
| GET    | `/conversations/{phone}`              | Get conversation history with a customer | Yes  | Seller   |
| DELETE | `/conversations/{phone}`              | Clear conversation history               | Yes  | Seller   |

### 7. WhatsApp (`/api/v1/whatsapp`)

| Method | Endpoint                        | Description                               | JWT  | Role     |
| ------ | ------------------------------- | ----------------------------------------- | ---- | -------- |
| GET    | `/whatsapp/webhook`             | Webhook verification (Meta challenge)     | No   | Meta     |
| POST   | `/whatsapp/webhook`             | Incoming WhatsApp message (Meta webhook)  | No   | Meta     |
| GET    | `/whatsapp/settings`            | Get WhatsApp agent settings for store     | Yes  | Seller   |
| PATCH  | `/whatsapp/settings`            | Update WhatsApp agent settings            | Yes  | Seller   |
| POST   | `/whatsapp/send`                | Send manual WhatsApp message              | Yes  | Seller   |
| GET    | `/whatsapp/stats`               | Get agent stats (conversations, orders)   | Yes  | Seller   |

### 8. AI Digitize (`/api/v1/digitize`)

| Method | Endpoint            | Description                              | JWT  | Role     |
| ------ | ------------------- | ---------------------------------------- | ---- | -------- |
| POST   | `/digitize`         | Extract product metadata from image      | Yes  | Seller   |
| GET    | `/digitize/usage`   | Get AI usage for today                   | Yes  | Seller   |

### 9. Admin (`/api/v1/admin`)

| Method | Endpoint                       | Description                         | JWT  | Role  |
| ------ | ------------------------------ | ----------------------------------- | ---- | ----- |
| GET    | `/admin/sellers`               | List all sellers                    | Yes  | Admin |
| GET    | `/admin/sellers/{id}`          | Get seller details                  | Yes  | Admin |
| PATCH  | `/admin/sellers/{id}/verify`   | Approve/reject seller verification  | Yes  | Admin |
| GET    | `/admin/analytics`             | Platform-wide metrics               | Yes  | Admin |
| GET    | `/admin/feedback`              | List user feedback                  | Yes  | Admin |
| POST   | `/admin/feedback/{id}/respond` | Respond to feedback                 | Yes  | Admin |

### 10. Analytics (`/api/v1/analytics`)

| Method | Endpoint              | Description                       | JWT  | Role     |
| ------ | --------------------- | --------------------------------- | ---- | -------- |
| GET    | `/analytics/dashboard`| Seller dashboard metrics          | Yes  | Seller   |
| GET    | `/analytics/revenue`  | Revenue over time                 | Yes  | Seller   |
| GET    | `/analytics/orders`   | Order volume analytics            | Yes  | Seller   |

---

## Migration Phases

### Phase 1: Scaffold + Auth (Week 1-2)
- [ ] Initialize FastAPI project with `main.py`, `config.py`, `database.py`
- [ ] Set up JWT verification middleware
- [ ] Implement auth router (signup, login, logout, session)
- [ ] Write tests for auth endpoints
- [ ] Deploy to staging

### Phase 2: Core CRUD (Week 3-4)
- [ ] Seller CRUD endpoints
- [ ] Product CRUD endpoints
- [ ] Order lifecycle endpoints
- [ ] File upload/storage endpoints
- [ ] Write comprehensive tests

### Phase 3: AI + WhatsApp (Week 5-6)
- [ ] Migrate digitize edge function to FastAPI
- [ ] Migrate WhatsApp agent to FastAPI (with Anthropic SDK)
- [ ] Conversation history endpoints
- [ ] WhatsApp webhook handler
- [ ] Write tests for AI + WhatsApp flows

### Phase 4: Admin + Analytics (Week 7-8)
- [ ] Admin endpoints (seller verification, platform metrics)
- [ ] Analytics endpoints (revenue, order volume, insights)
- [ ] Rate limiting + security hardening
- [ ] OpenAPI/Swagger documentation

### Phase 5: Frontend Migration (Week 9-10)
- [ ] Replace Supabase client calls with API client (fetch/axios)
- [ ] Update React hooks to call FastAPI endpoints
- [ ] Remove direct DB access from frontend
- [ ] E2E tests for full flow

---

## Dependencies (`requirements.txt`)

```txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
supabase==2.5.0
pydantic==2.9.0
pydantic-settings==2.5.0
python-jose[cryptography]==3.3.0
httpx==0.27.0
python-multipart==0.0.9
anthropic==0.27.3
google-genai==1.0.0
alembic==1.13.0
python-dotenv==1.0.0
pytest==8.3.0
pytest-asyncio==0.24.0
```

---

## Authentication Flow

```
1. Frontend calls POST /api/v1/auth/login with email + password
2. FastAPI proxies to Supabase Auth, gets JWT token
3. FastAPI returns JWT to frontend
4. Frontend stores JWT, sends as Bearer token in all requests
5. FastAPI middleware verifies JWT on each request
6. Middleware injects user_id + role into request state
7. Route handlers use user_id for row-level filtering
```

```
Request Flow:
┌──────────┐     JWT Bearer      ┌──────────┐     Service Role Key     ┌──────────┐
│ Frontend │ ──────────────────► │ FastAPI  │ ───────────────────────► │ Supabase │
└──────────┘                     └──────────┘                          └──────────┘
                                       │
                                       │ Use service_role_key (bypass RLS)
                                       │ Apply user_id filtering in service layer
                                       │
                                       ▼
                                  PostgreSQL (via Supabase)
```

**Important:** FastAPI uses the Supabase **service_role_key** (not anon key) and handles authorization at the application layer instead of relying on RLS policies.

---

## Environment Variables

```bash
# Supabase
SUPABASE_URL=https://pupjskrkmhzesjfltncb.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Auth
JWT_SECRET=your-jwt-secret
JWT_ALGORITHM=HS256

# AI
GEMINI_API_KEY=your-gemini-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# WhatsApp
WHATSAPP_TOKEN=your-whatsapp-token
PHONE_NUMBER_ID=your-phone-number-id
VERIFY_TOKEN=your-verify-token
UPI_ID=snapshop@upi

# Server
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
```

---

## Summary

| Category              | Endpoints |
| --------------------- | --------- |
| Auth                  | 6         |
| Sellers               | 5         |
| Products              | 6         |
| Orders                | 5         |
| Files                 | 5         |
| Conversations         | 3         |
| WhatsApp              | 6         |
| AI Digitize           | 2         |
| Admin                 | 6         |
| Analytics             | 3         |
| **Total**             | **47**    |
