# SnapShop AI — Seller User Manual

## Table of Contents

1. [Creating an Account](#1-creating-an-account)
2. [Email Verification (OTP)](#2-email-verification-otp)
3. [Logging In](#3-logging-in)
4. [Store Setup](#4-store-setup)
5. [Seller Dashboard Overview](#5-seller-dashboard-overview)
6. [Store Verification Process](#6-store-verification-process)
7. [Uploading Products with AI Digitization](#7-uploading-products-with-ai-digitization)
8. [Inventory Management](#8-inventory-management)
9. [Managing Orders](#9-managing-orders)
10. [Printing Product Labels / Barcode](#10-printing-product-labels--barcode)
11. [Store Settings](#11-store-settings)
12. [Analytics](#12-analytics)
13. [WhatsApp AI Agent](#13-whatsapp-ai-agent)
14. [Profile & Sign Out](#14-profile--sign-out)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Creating an Account

1. Open the SnapShop AI website.
2. Click **"Get Started"** or **"Sign In"** on the homepage.
3. On the Auth page, click **"Create Account"** (or **"Sign Up"** tab).
4. Select your role — choose **Seller** (Store icon) with the label "Create your digital store".
   > ⚠️ Your role is permanent and cannot be changed later.
5. Fill in the registration form:
   - **Phone**: Enter your 10-digit mobile number (starts with +91, first digit >5).
   - **Full Name**: Your name or business owner name.
   - **Email**: A valid email address (used for login and all notifications).
   - **Password**: Minimum 6 characters.
6. Click **"Create Account"**.

---

## 2. Email Verification (OTP)

1. After signing up, an OTP (One-Time Password) is sent to your email.
2. Enter the **6-digit code** on the verification screen.
3. If you don't see the email, check your **Spam/Promotions** folder.
4. Resend cooldowns:
   - 1st resend: **60 seconds**
   - 2nd resend: **180 seconds**
   - 3rd resend: **300 seconds**
   - Maximum 3 resend attempts.
5. On successful verification, you will be redirected to your **Seller Dashboard**.

---

## 3. Logging In

1. Go to the website and click **"Sign In"**.
2. Enter your **Email** and **Password**.
3. Click **"Sign In"**.
4. You will be redirected to your **Seller Dashboard**.

### Forgot Password

1. Click **"Forgot Password?"** on the login page.
2. Enter your **Email**.
3. Check your email for the OTP code.
4. Enter the OTP → redirected to **Reset Password** page.
5. Enter **new password** (min 6 chars) and confirm.
6. Click **"Update Password"** → redirected to login.

### Login Troubles

- After **5 failed attempts**, you're locked out for **15 minutes**.
- If your account is blocked, you'll see a message with admin contact details.

---

## 4. Store Setup

The first time you log in as a seller, you will see the **Store Setup** form instead of the dashboard. Complete all fields:

### Step 1 — Basic Info

- **Your Full Name** (required)
- **Contact Number** (+91, 10 digits)
- **Store Name** (required — this becomes your public store name)
- **Store Description** (tell customers what you sell)

### Step 2 — Location

- **Location** (city/area — required)
- **Shop Number** (optional, e.g., "Shop 12, Block A")

### Step 3 — Business Verification

- **GSTIN** (optional)
- **Registered Business Name** (required)
- Upload **Verification Documents**:
  - ID proof
  - GST certificate (if applicable)
  - Shop photos
  - Accepted formats: PDF, JPG, PNG (multiple files allowed)

### Step 4 — Submit

1. Review all information.
2. Click **"Create Store"**.
3. Your store is now **pending verification** by the admin.
   > ⏳ Verification usually takes 24-48 hours.

After submission, you will be taken to your Seller Dashboard.

---

## 5. Seller Dashboard Overview

The dashboard has three main tabs:

| Tab          | Route           | What You Can Do                                    |
| ------------ | --------------- | -------------------------------------------------- |
| **Products** | `?tab=products` | View product catalog, store stats, AI agent status |
| **Tools**    | `?tab=tools`    | Access Orders, Upload, Inventory, WhatsApp Agent   |
| **Profile**  | `?tab=profile`  | View analytics, edit store settings                |

### Bottom Navigation (Mobile)

Quick access to Products, Tools, and Profile tabs.

---

## 6. Store Verification Process

### Pending Verification

An amber banner will appear at the top:

> "Store verification pending — Our admins are reviewing your store."

During this time:

- ✅ You can upload products (via AI digitization)
- ✅ You can manage inventory
- ❌ Your store is **not visible** to buyers
- ❌ Orders cannot be placed

### Approved

The banner disappears, and your store goes **live**. Buyers can now browse your store and place orders.

### Rejected

A red banner appears with admin feedback:

> Read the rejection reason, make corrections, and click **"Resubmit"**.
> You must wait **24 hours** before resubmitting.

---

## 7. Uploading Products with AI Digitization

This is the core feature — SnapShop AI automatically extracts product details from photos using AI (Groq Vision + Google Gemini).

### Accessing Upload

1. Go to **Tools** tab → Click **"Upload"**.
2. The Upload Zone page opens.

### Daily AI Usage

- Default limit: **25 products per day** (configurable by admin).
- A progress bar shows your usage: `[used] / [limit] credits`.
- When you reach the limit, the upload is disabled until the next day.

### Optional: Set a Uniform Price

Before uploading, you can set a **Price Override** — all uploaded products will use this price instead of the AI's estimate.

### Uploading Images

1. **Drag & drop** images into the drop zone, or click to select files.
2. Supported formats: JPG, PNG (max **5MB** per file).
3. Images larger than 150KB are **automatically compressed** to ~100KB JPEG (max 1200px) for faster AI processing.
4. A progress bar shows upload status.

### AI Processing

- Each image is sent to the AI for analysis.
- The AI extracts: **title, description, price, category, tags, size variants, discount**.
- Processing takes a few seconds per image.

### Reviewing AI Results

Each product is shown as a review card with:

| Action      | What It Does                                |
| ----------- | ------------------------------------------- |
| **Approve** | Saves the product to your catalog as-is     |
| **Edit**    | Opens an editor to modify AI-generated data |
| **Reject**  | Discards the product entirely               |

#### Editing a Product

You can modify:

- **Product Title**
- **Price** and **Discount (%)**
- **Category** (select from available categories)
- **Description**
- **Tags** (comma-separated)
- **Size Variants** (add/remove sizes with stock counts)

Fields with low AI confidence (below 70%) are highlighted in **amber** — double-check these.

### Completing Upload

After reviewing all products, you'll see a success message:

> "Digitization complete — N files processed."

Click **"Upload More"** to add more products.

---

## 8. Inventory Management

### Accessing Inventory

1. Go to **Tools** tab → Click **"Inventory"**.
2. The Inventory Editor shows all your products in a table.

### Features

- **Search**: Filter products by title or category.
- **Edit Stock**:
  - **Single stock**: Edit the number directly.
  - **Size-based stock**: Expand to edit individual size variants. Add new sizes or remove existing ones.
- **Delete**: Remove a product permanently (with confirmation prompt).
- **Save**: Save individual changes per row, or click **"Save All"** for batch updates.

### Low Stock Alerts

When any product's stock falls below the threshold (default: 5), a toast alert will appear on your dashboard.

---

## 9. Managing Orders

### Accessing Orders

1. Go to **Tools** tab → Click **"Orders"**.
2. All customer orders are displayed as cards.

### Order Card Information

Each card shows:

- **Product**: Image, title, price, order dates
- **Customer**: Name, status badges, delivery address preview
- **Actions**: WhatsApp/Phone contact buttons

### Order Status Actions

| Current Status            | Available Action                         | Next Status        |
| ------------------------- | ---------------------------------------- | ------------------ |
| **Pending**               | "Start Preparing"                        | Preparing          |
| **Preparing**             | "Mark Ready for Dispatch"                | Ready for Dispatch |
| **Ready / Confirmed**     | "Ship Order" (opens shipping dialog)     | Shipped            |
| **Shipped**               | "Out for Delivery"                       | Out for Delivery   |
| **Out for Delivery**      | "Mark Delivered"                         | Delivered          |
| **Delivered (COD)**       | "Confirm Cash Payment"                   | Payment = Paid     |
| **Awaiting Verification** | "View Payment Proof" + "Confirm Payment" | Payment = Paid     |
| **Pending / Confirmed**   | "Cancel Order"                           | Cancelled          |

### Shipping an Order

When you click **"Ship Order"**, a dialog asks:

1. **Delivery Method**:
   - **Courier**: Enter courier provider name + tracking number (buyer gets a tracking link).
   - **Self Delivery**: Enter delivery person's name + phone number (buyer can call them).
2. Click **"Confirm Shipment"**.

### Payment Verification (UPI)

When a buyer pays via UPI and uploads a payment proof:

1. Click **"View Payment Proof"** to see the screenshot.
2. Verify the amount and transaction details.
3. Click **"Confirm Payment"** to mark the order as paid.

### Real-Time Notifications

When a new order arrives, a toast notification appears immediately — no page refresh needed.

---

## 10. Printing Product Labels / Barcode

### Access Label Printing

1. Go to **Products** tab.
2. Click the **"Print Labels"** button.
3. A print dialog opens with labels for all your products.

### Label Contents

Each label includes:

- Product title
- Price (with MRP and discount if applicable)
- Product image
- Barcode (auto-generated from product ID)

### How to Print

1. Preview the labels in your browser's print dialog.
2. Select a **label/printer paper size** (e.g., Avery 5160 or similar sticker sheets).
3. Click **Print**.

The labels are formatted to fit standard sticker sheets for easy peeling and attaching to products.

---

## 11. Store Settings

### Accessing Settings

1. Go to **Profile** tab → Click **"Settings"**.

### Sections

#### Store Info

- **Store Name** — your public store name.
- **Store Description** — describe what you sell.
- **Store URL** — auto-generated: `/store/[your-store-slug]`.

#### Location & Maps

- Update your store location/address.
- Add a **Google Maps embed URL** — paste the full `<iframe>` embed code; the URL is extracted automatically.
- A live map preview shows the location.

#### Banner & Theme

- **Upload Banner**: Store banner image (appears at the top of your storefront).
- **Theme Color**: Choose from 12 preset colors or pick a custom color using the color picker. This sets your store's accent color.

#### Contact Details

- **Contact Number** (phone)
- **Shop Number** (e.g., "Shop 12, Block A")
- **GSTIN** (disabled after admin verification)
- **Registered Business Name** (disabled after admin verification)

#### Payment Settings

- **Preferred Payment Method**: "UPI", "Razorpay", or "Both"
- **UPI ID**: Your UPI handle (e.g., `you@paytm`)
- **Razorpay Account ID**: Your Razorpay merchant ID

### Saving Changes

Click **"Save"** at the bottom. Your storefront updates immediately.

---

## 12. Analytics

### Accessing Analytics

1. Go to **Profile** tab → Click **"Analytics"**.

### Metrics Cards

Four key metrics at the top:

- **Total Revenue**: All completed/shipped order revenue.
- **Total Orders**: Number of completed/shipped orders.
- **Avg Order Value**: Average amount per order.
- **Online Payments**: Count of UPI + Razorpay payments.

### Sales Performance Chart

An area chart showing revenue over time. Toggle between:

- **Daily** — last 7 days
- **Weekly** — last 4 weeks
- **Monthly** — last 6 months

### Order Volume Chart

A bar chart showing number of orders per period.

### Insights Card

Actionable tips:

- Best-selling period
- Total items sold
- Seasonal tips (e.g., "Sellers who offer discounts during festive seasons see 2x more orders")

> ⚠️ Cancelled orders and failed payments are excluded from calculations.

---

## 13. WhatsApp AI Agent

### Status

The WhatsApp AI Agent is **in development** and **not yet ready for production use**.

### What It Will Do (Coming Soon)

| Feature             | Description                                       |
| ------------------- | ------------------------------------------------- |
| AI-Powered Sales    | Customers can browse your catalog via WhatsApp    |
| Multi-Language      | Supports Hindi, English, Telugu, and more         |
| UPI Payments        | Customers can pay via UPI through WhatsApp        |
| Conversation Memory | Agent remembers past customer interactions        |
| 24/7 Availability   | Answers customer queries even when you're offline |

### Setup (When Available)

1. Go to **Tools** → **WhatsApp Agent**.
2. Configure your store slug and UPI ID.
3. Click **"Activate Agent"**.
4. Customers can message your store's WhatsApp number to browse products and place orders.

---

## 14. Profile & Sign Out

### Viewing Profile

1. Go to the **Profile** tab.
2. View your name, email, and store name.

### Signing Out

1. Click **"Sign Out"** at the bottom of the Profile tab.
2. You will be redirected to the homepage.

---

## 15. Troubleshooting

| Problem                       | Solution                                                          |
| ----------------------------- | ----------------------------------------------------------------- |
| Can't log in                  | Use **Forgot Password** or wait 15 min if locked out.             |
| Store not visible             | Your store must be **approved** by admin (24-48 hrs).             |
| AI not processing images      | Check your **daily AI limit**. Images must be <5MB.               |
| AI returns wrong product data | **Edit** the product manually before approving.                   |
| Order won't ship              | Fill in all required shipping details (courier or self-delivery). |
| Low confidence warnings       | Fields in amber need your review — AI was <70% sure.              |
| Can't upload documents        | Supported: PDF, JPG, PNG. Max 5MB per file.                       |
| Language issues               | Use the globe icon (Language Switcher) to change language.        |
| App tour not showing          | The tour triggers once after first dashboard visit.               |

---

## Quick Reference

| Action          | Where                                  |
| --------------- | -------------------------------------- |
| Set up store    | First login → Store Setup form         |
| Upload products | Tools → Upload (drag & drop images)    |
| Edit products   | Tools → Inventory                      |
| View orders     | Tools → Orders                         |
| Print labels    | Products tab → "Print Labels"          |
| Store settings  | Profile → Settings                     |
| Analytics       | Profile → Analytics                    |
| Contact support | Bug icon (dashboard header) → Feedback |
| Change language | Globe icon (top navigation)            |
| Sign out        | Profile tab → "Sign Out"               |

---

### Order Status Lifecycle Reference

```
Pending → Preparing → Ready for Dispatch → Shipped → Out for Delivery → Delivered
                                                               ↓
                                                         Cancelled
```

### Payment Status Lifecycle Reference

```
Pending → Paid (COD or auto-confirm)
Pending → Awaiting Verification (UPI) → Paid (seller confirms)
Pending → Failed (payment declined)
Paid → Refunded (if cancelled after payment)
```
