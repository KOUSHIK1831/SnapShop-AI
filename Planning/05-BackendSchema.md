# Document 05 — Backend Schema: Data Model & Auth Architecture

---

## Table: `profiles`

| Column       | Type          | Constraints                                         | Notes                 |
| ------------ | ------------- | --------------------------------------------------- | --------------------- |
| `id`         | `uuid`        | PK, `gen_random_uuid()`                             | Same as auth.users.id |
| `email`      | `text`        | NOT NULL                                            |                       |
| `role`       | `text`        | NOT NULL, CHECK(role IN ('admin','seller','buyer')) |                       |
| `created_at` | `timestamptz` | DEFAULT NOW()                                       |                       |

## Table: `sellers`

| Column                     | Type          | Constraints              | Notes                         |
| -------------------------- | ------------- | ------------------------ | ----------------------------- |
| `id`                       | `uuid`        | PK, `gen_random_uuid()`  |                               |
| `user_id`                  | `uuid`        | FK → profiles.id, UNIQUE | One seller profile per user   |
| `store_name`               | `text`        |                          |                               |
| `store_slug`               | `text`        | UNIQUE                   | Used in `/store/:slug` URL    |
| `description`              | `text`        |                          | Store description             |
| `location`                 | `text`        |                          |                               |
| `phone`                    | `text`        |                          |                               |
| `contact_number`           | `text`        |                          | WhatsApp contact number       |
| `store_number`             | `text`        |                          | Alternate number              |
| `maps_url`                 | `text`        |                          | Google Maps link              |
| `banner_url`               | `text`        |                          | Store banner image            |
| `theme_color`              | `text`        | DEFAULT '#6C47FF'        | Storefront theme color        |
| `verification_status`      | `text`        | DEFAULT 'pending'        | pending / approved / rejected |
| `admin_feedback`           | `text`        |                          | Rejection reason              |
| `last_submitted_at`        | `timestamptz` |                          |                               |
| `gstin`                    | `text`        |                          | GST number                    |
| `registered_business_name` | `text`        |                          |                               |
| `verification_documents`   | `jsonb`       |                          | Document URLs                 |
| `ai_daily_limit`           | `int`         | DEFAULT 50               | Daily AI digitization limit   |
| `created_at`               | `timestamptz` | DEFAULT NOW()            |                               |

## Table: `products`

| Column                | Type          | Constraints               | Notes                       |
| --------------------- | ------------- | ------------------------- | --------------------------- |
| `id`                  | `uuid`        | PK, `gen_random_uuid()`   |                             |
| `seller_id`           | `uuid`        | FK → sellers.id, NOT NULL |                             |
| `title`               | `text`        | NOT NULL                  |                             |
| `description`         | `text`        |                           |                             |
| `price`               | `numeric`     | NOT NULL                  |                             |
| `category`            | `text`        |                           |                             |
| `tags`                | `jsonb`       | DEFAULT '[]'              | AI-extracted tags           |
| `size`                | `text`        |                           | Primary size (legacy)       |
| `size_variants`       | `jsonb`       | DEFAULT '[]'              | Multi-size stock management |
| `discount_percent`    | `numeric`     | DEFAULT 0                 | 0 to 100                    |
| `image_url`           | `text`        |                           | Main product image          |
| `image_urls`          | `jsonb`       | DEFAULT '[]'              | Multiple images             |
| `stock`               | `int`         | DEFAULT 0                 |                             |
| `low_stock_threshold` | `int`         | DEFAULT 5                 |                             |
| `created_at`          | `timestamptz` | DEFAULT NOW()             |                             |

## Table: `orders`

| Column               | Type          | Constraints                | Notes                                                                                    |
| -------------------- | ------------- | -------------------------- | ---------------------------------------------------------------------------------------- |
| `id`                 | `uuid`        | PK, `gen_random_uuid()`    |                                                                                          |
| `seller_id`          | `uuid`        | FK → sellers.id, NOT NULL  |                                                                                          |
| `product_id`         | `uuid`        | FK → products.id, NOT NULL |                                                                                          |
| `buyer_id`           | `uuid`        | FK → profiles.id, NULLABLE | NULL for guest/WhatsApp orders                                                           |
| `buyer_name`         | `text`        | NOT NULL                   |                                                                                          |
| `buyer_phone`        | `text`        |                            |                                                                                          |
| `quantity`           | `int`         | DEFAULT 1                  |                                                                                          |
| `unit_price`         | `numeric`     |                            | Snapshot of price at order time                                                          |
| `selected_size`      | `text`        |                            | Size chosen by buyer                                                                     |
| `delivery_address`   | `jsonb`       |                            | { name, phone, line1, city, state, pincode }                                             |
| `status`             | `text`        | DEFAULT 'pending'          | pending, accepted, confirmed, shipped, out_for_delivery, delivered, completed, cancelled |
| `del_type`           | `text`        | DEFAULT 'courier'          | courier / self_delivery                                                                  |
| `tracking_provider`  | `text`        |                            |                                                                                          |
| `tracking_number`    | `text`        |                            |                                                                                          |
| `pay_method`         | `text`        | DEFAULT 'cod'              | cod / online                                                                             |
| `pay_status`         | `text`        | DEFAULT 'pending'          | pending, paid, failed, refunded                                                          |
| `gateway_payment_id` | `text`        |                            |                                                                                          |
| `created_at`         | `timestamptz` | DEFAULT NOW()              |                                                                                          |

## Table: `order_tracking_logs`

| Column        | Type          | Constraints             | Notes |
| ------------- | ------------- | ----------------------- | ----- |
| `id`          | `uuid`        | PK, `gen_random_uuid()` |       |
| `order_id`    | `uuid`        | FK → orders.id          |       |
| `status`      | `text`        | NOT NULL                |       |
| `description` | `text`        |                         |       |
| `changed_at`  | `timestamptz` | DEFAULT NOW()           |       |

## Table: `notification_logs`

| Column       | Type          | Constraints             | Notes                        |
| ------------ | ------------- | ----------------------- | ---------------------------- |
| `id`         | `uuid`        | PK, `gen_random_uuid()` |                              |
| `user_id`    | `uuid`        | FK → profiles.id        |                              |
| `type`       | `text`        |                         | order_alert, low_stock, etc. |
| `payload`    | `jsonb`       |                         |                              |
| `created_at` | `timestamptz` | DEFAULT NOW()           |                              |

## Table: `system_audit_logs`

| Column         | Type          | Constraints             | Notes |
| -------------- | ------------- | ----------------------- | ----- |
| `id`           | `uuid`        | PK, `gen_random_uuid()` |       |
| `actor_id`     | `uuid`        | FK → profiles.id        |       |
| `action`       | `text`        |                         |       |
| `target_table` | `text`        |                         |       |
| `target_id`    | `uuid`        |                         |       |
| `created_at`   | `timestamptz` | DEFAULT NOW()           |       |

## Table: `files`

| Column       | Type          | Constraints             | Notes                                      |
| ------------ | ------------- | ----------------------- | ------------------------------------------ |
| `id`         | `uuid`        | PK, `gen_random_uuid()` |                                            |
| `seller_id`  | `uuid`        | FK → sellers.id         |                                            |
| `file_url`   | `text`        | NOT NULL                | Supabase Storage URL                       |
| `file_type`  | `text`        |                         | image/jpeg, image/png, etc.                |
| `status`     | `text`        | DEFAULT 'uploaded'      | uploaded / processing / completed / failed |
| `created_at` | `timestamptz` | DEFAULT NOW()           |                                            |

## Table: `feedback`

| Column           | Type          | Constraints             | Notes       |
| ---------------- | ------------- | ----------------------- | ----------- |
| `id`             | `uuid`        | PK, `gen_random_uuid()` |             |
| `user_id`        | `uuid`        | FK → profiles.id        |             |
| `message`        | `text`        | NOT NULL                |             |
| `admin_response` | `text`        |                         | Admin reply |
| `created_at`     | `timestamptz` | DEFAULT NOW()           |             |

## Table: `conversations`

| Column       | Type          | Constraints             | Notes                           |
| ------------ | ------------- | ----------------------- | ------------------------------- |
| `id`         | `uuid`        | PK, `gen_random_uuid()` |                                 |
| `phone`      | `text`        | NOT NULL                | Customer's WhatsApp number      |
| `store_slug` | `text`        | NOT NULL                |                                 |
| `messages`   | `jsonb`       | DEFAULT '[]'            | Message history array (last 30) |
| `created_at` | `timestamptz` | DEFAULT NOW()           |                                 |
| `updated_at` | `timestamptz` | DEFAULT NOW()           |                                 |

**Unique constraint:** `(phone, store_slug)`

## Relationships

- `sellers.user_id` → `profiles.id` (one-to-one)
- `products.seller_id` → `sellers.id` (many-to-one)
- `orders.seller_id` → `sellers.id` (many-to-one)
- `orders.product_id` → `products.id` (many-to-one)
- `orders.buyer_id` → `profiles.id` (many-to-one, nullable)
- `files.seller_id` → `sellers.id` (many-to-one)
- `feedback.user_id` → `profiles.id` (many-to-one)

## Auth Provider

**Supabase Auth** — JWT-based authentication with email/password.

## Row Level Security (RLS)

All tables have RLS enabled. Policies enforced per role:

| Table           | Seller Policy             | Buyer Policy           | Admin Policy |
| --------------- | ------------------------- | ---------------------- | ------------ |
| `sellers`       | Read/update own row       | No access              | Full access  |
| `products`      | CRUD own products         | Read public products   | Full access  |
| `orders`        | Read orders for own store | Read/insert own orders | Full access  |
| `files`         | CRUD own files            | No access              | Full access  |
| `conversations` | Service role only         | No access              | No access    |
| `feedback`      | Insert own, read own      | Insert own, read own   | Full access  |

## User Roles

| Role       | Permissions                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------- |
| **admin**  | Full platform access — manage sellers, view all orders, respond to feedback, platform analytics |
| **seller** | Manage own store, products, orders, files; view own analytics; access AI digitization           |
| **buyer**  | Browse storefronts, place orders, track own orders, contact sellers via WhatsApp                |

## Sensitive Fields

No payment data stored directly. UPI IDs are environment variables, not stored per-order in the database. Payment is handled via UPI deep links generated by the WhatsApp agent.

## File Storage

- **Bucket:** `uploads` (public)
- **Path pattern:** `/{sellerId}/{timestamp}-{random}.{ext}`
- **Access:** Public URLs (no auth required to view product images)
