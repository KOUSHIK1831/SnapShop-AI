import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  BookOpen,
  ShoppingBag,
  Store,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';

type ManualType = 'buyer' | 'seller';

interface Section {
  id: string;
  title: string;
}

const sections: Record<ManualType, Section[]> = {
  buyer: [
    { id: 'account', title: '1. Creating an Account' },
    { id: 'otp', title: '2. Email Verification (OTP)' },
    { id: 'login', title: '3. Logging In' },
    { id: 'browse', title: '4. Browsing Stores & Products' },
    { id: 'order', title: '5. Placing an Order' },
    { id: 'payment', title: '6. Making Payment' },
    { id: 'track', title: '7. Tracking Your Order' },
    { id: 'history', title: '8. Viewing Order History' },
    { id: 'profile', title: '9. Profile & Settings' },
    { id: 'logout', title: '10. Logging Out' },
    { id: 'trouble', title: '11. Troubleshooting' },
  ],
  seller: [
    { id: 'account', title: '1. Creating an Account' },
    { id: 'otp', title: '2. Email Verification (OTP)' },
    { id: 'login', title: '3. Logging In' },
    { id: 'setup', title: '4. Store Setup' },
    { id: 'dashboard', title: '5. Seller Dashboard Overview' },
    { id: 'verification', title: '6. Store Verification Process' },
    { id: 'upload', title: '7. Uploading Products with AI' },
    { id: 'inventory', title: '8. Inventory Management' },
    { id: 'orders', title: '9. Managing Orders' },
    { id: 'labels', title: '10. Printing Labels / Barcode' },
    { id: 'settings', title: '11. Store Settings' },
    { id: 'analytics', title: '12. Analytics' },
    { id: 'whatsapp', title: '13. WhatsApp AI Agent' },
    { id: 'signout', title: '14. Profile & Sign Out' },
    { id: 'trouble', title: '15. Troubleshooting' },
  ],
};

export default function VolunteerManualPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType =
    searchParams.get('type') === 'seller' ? 'seller' : 'buyer';
  const [manual, setManual] = useState<ManualType>(initialType);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/40 bg-background/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-5" />
            </Button>
            <BookOpen className="size-5 text-primary" />
            <span className="font-semibold">User Manual</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-3 mb-6">
          <Button
            variant={manual === 'buyer' ? 'default' : 'outline'}
            onClick={() => setManual('buyer')}
            className="gap-2"
          >
            <ShoppingBag className="size-4" />
            Buyer Manual
          </Button>
          <Button
            variant={manual === 'seller' ? 'default' : 'outline'}
            onClick={() => setManual('seller')}
            className="gap-2"
          >
            <Store className="size-4" />
            Seller Manual
          </Button>
        </div>

        <div className="flex gap-6">
          <aside className="hidden lg:block w-56 shrink-0">
            <nav className="sticky top-20 space-y-0.5">
              {sections[manual].map(s => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-1.5 px-3 rounded-lg hover:bg-accent"
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0 space-y-6">
            {manual === 'buyer' ? <BuyerManual /> : <SellerManual />}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader
        className="cursor-pointer select-none flex flex-row items-center justify-between py-3 px-5"
        onClick={() => setOpen(!open)}
      >
        <CardTitle className="text-base">{title}</CardTitle>
        <Button variant="ghost" size="icon" className="size-7">
          {open ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="px-5 pb-5 pt-0 text-sm text-muted-foreground space-y-2">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

function StepList({ items }: { items: string[] }) {
  return (
    <ol className="list-decimal list-inside space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-muted-foreground">
          {item}
        </li>
      ))}
    </ol>
  );
}

function BuyerManual() {
  return (
    <>
      <SectionCard id="account" title="1. Creating an Account">
        <StepList
          items={[
            'Open the SnapShop AI website.',
            'Click "Get Started" or "Sign In" on the homepage.',
            'Click "Create Account" and select Buyer (Shopping Bag icon).',
            'Role is permanent — cannot be changed later.',
            'Fill in: Phone (+91, 10 digits), Full Name, Email, Password (min 6 chars).',
            'Click "Create Account" → redirected to email verification.',
          ]}
        />
      </SectionCard>

      <SectionCard id="otp" title="2. Email Verification (OTP)">
        <StepList
          items={[
            'A 6-digit OTP is sent to your email.',
            'Enter the code on the verification screen.',
            "Don't see it? Check Spam/Promotions folder.",
            'Resend after: 60s → 180s → 300s (max 3 resends).',
            'Success → redirected to your Buyer Dashboard.',
          ]}
        />
      </SectionCard>

      <SectionCard id="login" title="3. Logging In">
        <StepList
          items={[
            'Click "Sign In" and enter Email + Password.',
            'Click "Sign In" → redirected to Buyer Dashboard.',
          ]}
        />
        <p className="mt-2">
          <strong>Forgot Password?</strong> Click "Forgot Password" → enter
          email → check OTP → set new password.
        </p>
        <p>
          <strong>Locked out?</strong> 5 failed attempts = 15 minute wait.
        </p>
      </SectionCard>

      <SectionCard id="browse" title="4. Browsing Stores & Products">
        <p>
          Buyer Dashboard has three tabs: <strong>Shops</strong>,{' '}
          <strong>Orders</strong>, <strong>Profile</strong>.
        </p>
        <p className="font-medium mt-2">Exploring Shops</p>
        <StepList
          items={[
            'Go to the Shops tab.',
            'Browse store cards (banner, name, location, categories).',
            'Search by name/location or filter by category.',
            'Click "Visit Store" on any card.',
          ]}
        />
        <p className="mt-2">
          The storefront is public — no login needed to browse. Each product
          shows image, title, price, sizes, stock, "Order Now", and WhatsApp
          inquiry.
        </p>
      </SectionCard>

      <SectionCard id="order" title="5. Placing an Order">
        <p>
          Click "Order Now" on a product. The Order Confirmation dialog has 3
          steps:
        </p>
        <p className="font-medium mt-2">Step 1 — Delivery Address</p>
        <p>Fill in: Name, Phone, Address, City, State, Pincode.</p>
        <p className="font-medium mt-2">Step 2 — Payment Method</p>
        <p>Choose: Cash on Delivery, UPI QR, or Razorpay.</p>
        <p className="font-medium mt-2">Step 3 — Complete</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>COD</strong>: Click "Place Order" — pay on delivery.
          </li>
          <li>
            <strong>UPI</strong>: Scan QR → pay → upload proof → "I have paid".
          </li>
          <li>
            <strong>Razorpay</strong>: Complete in Razorpay checkout window.
          </li>
        </ul>
      </SectionCard>

      <SectionCard id="payment" title="6. Making Payment">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium">Method</th>
                <th className="text-left py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-4">Cash on Delivery</td>
                <td className="py-2">Pay cash on delivery</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">UPI QR</td>
                <td className="py-2">Pay immediately via GPay/PhonePe/Paytm</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Razorpay</td>
                <td className="py-2">
                  Pay immediately via card/UPI/netbanking
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard id="track" title="7. Tracking Your Order">
        <StepList
          items={[
            'Go to Orders tab → Click "Track Order".',
            'Progress: Placed → Preparing → Ready → Shipped → Out for Delivery → Delivered.',
            'When shipped: see courier tracking link or delivery person phone.',
          ]}
        />
      </SectionCard>

      <SectionCard id="history" title="8. Viewing Order History">
        <p>
          Go to <strong>Orders</strong> tab. All orders listed with product,
          status badge, quantity, payment info, price, and action buttons.
        </p>
      </SectionCard>

      <SectionCard id="profile" title="9. Profile & Settings">
        <p>
          Go to <strong>Profile</strong> tab. View your name, email, avatar, and
          role badge. Only action: <strong>"Sign Out"</strong>.
        </p>
        <p>Buyers cannot edit profile — contact the seller for any changes.</p>
      </SectionCard>

      <SectionCard id="logout" title="10. Logging Out">
        <StepList
          items={[
            'Go to Profile tab.',
            'Click "Sign Out".',
            'Redirected to homepage.',
          ]}
        />
      </SectionCard>

      <SectionCard id="trouble" title="11. Troubleshooting">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium">Problem</th>
                <th className="text-left py-2 font-medium">Solution</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-4">Can't log in</td>
                <td className="py-2">
                  Use Forgot Password. Wait 15 min if locked out.
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">OTP not received</td>
                <td className="py-2">
                  Check Spam folder. Wait for resend cooldown.
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Order stuck on Pending</td>
                <td className="py-2">Contact seller via WhatsApp button.</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Payment not reflecting</td>
                <td className="py-2">
                  Wait 5 min then contact seller with proof.
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Account blocked</td>
                <td className="py-2">Contact admin from the alert message.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Language issues</td>
                <td className="py-2">
                  Use the Language Switcher (globe icon).
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}

function SellerManual() {
  return (
    <>
      <SectionCard id="account" title="1. Creating an Account">
        <StepList
          items={[
            'Click "Get Started" or "Sign In" → "Create Account".',
            'Select Seller (Store icon).',
            'Fill in: Phone (+91, 10 digits), Full Name, Email, Password.',
            'Click "Create Account" → verify email via OTP.',
          ]}
        />
      </SectionCard>

      <SectionCard id="otp" title="2. Email Verification (OTP)">
        <p>
          Enter the 6-digit OTP sent to your email. Check Spam if not received.
          Resend cooldowns: 60s → 180s → 300s (max 3).
        </p>
      </SectionCard>

      <SectionCard id="login" title="3. Logging In">
        <p>
          Enter Email + Password → Click "Sign In" → redirected to Seller
          Dashboard.
        </p>
      </SectionCard>

      <SectionCard id="setup" title="4. Store Setup">
        <p>First login shows the Store Setup form:</p>
        <StepList
          items={[
            'Basic Info: Full name, contact number, store name, description.',
            'Location: City/area, shop number (optional).',
            'Verification: GSTIN (optional), registered business name, upload ID/GST/shop photos.',
            'Click "Create Store" → status: Pending Verification (24-48 hrs).',
          ]}
        />
      </SectionCard>

      <SectionCard id="dashboard" title="5. Seller Dashboard Overview">
        <p>
          Three tabs: <strong>Products</strong> (catalog + stats),{' '}
          <strong>Tools</strong> (Orders, Upload, Inventory, WhatsApp),{' '}
          <strong>Profile</strong> (Analytics, Settings).
        </p>
      </SectionCard>

      <SectionCard id="verification" title="6. Store Verification Process">
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Pending</strong>: Amber banner — store not visible to
            buyers.
          </li>
          <li>
            <strong>Approved</strong>: Store goes live, buyers can browse and
            order.
          </li>
          <li>
            <strong>Rejected</strong>: Red banner with feedback. Fix and
            resubmit (24h cooldown).
          </li>
        </ul>
      </SectionCard>

      <SectionCard id="upload" title="7. Uploading Products with AI">
        <StepList
          items={[
            'Tools → Upload. Check daily AI usage (default 25/day).',
            'Optionally set a Price Override for all uploads.',
            'Drag & drop images (max 5MB each, auto-compressed).',
            'AI extracts: title, price, category, tags, sizes, discount.',
            'Review each: Approve / Edit / Reject.',
            'Approved products are saved to your catalog.',
          ]}
        />
      </SectionCard>

      <SectionCard id="inventory" title="8. Inventory Management">
        <p>
          Tools → Inventory. Search products, edit stock (single or size-based),
          delete products. Use "Save All" for batch updates.
        </p>
      </SectionCard>

      <SectionCard id="orders" title="9. Managing Orders">
        <p>
          Tools → Orders. Each order shows product, customer, and actions by
          status:
        </p>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium">Status</th>
                <th className="text-left py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-4">Pending</td>
                <td className="py-2">Start Preparing</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Preparing</td>
                <td className="py-2">Mark Ready for Dispatch</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Ready / Confirmed</td>
                <td className="py-2">Ship Order (courier or self-delivery)</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Shipped</td>
                <td className="py-2">Out for Delivery</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Out for Delivery</td>
                <td className="py-2">Mark Delivered</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Delivered (COD)</td>
                <td className="py-2">Confirm Cash Payment</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Awaiting Verification</td>
                <td className="py-2">View Proof + Confirm Payment</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Pending / Confirmed</td>
                <td className="py-2">Cancel Order</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard id="labels" title="10. Printing Labels / Barcode">
        <p>
          Products tab → Click "Print Labels". Labels include title, price,
          image, and barcode. Print via browser's print dialog onto sticker
          sheets.
        </p>
      </SectionCard>

      <SectionCard id="settings" title="11. Store Settings">
        <p>
          Profile → Settings. Configure: store name, description, location,
          banner image, theme color, contact details, UPI ID, Razorpay account.
        </p>
      </SectionCard>

      <SectionCard id="analytics" title="12. Analytics">
        <p>
          Profile → Analytics. View revenue, orders, avg order value, online
          payments. Sales charts (daily/weekly/monthly) with insights.
        </p>
      </SectionCard>

      <SectionCard id="whatsapp" title="13. WhatsApp AI Agent">
        <p>
          <strong>Coming Soon.</strong> An AI sales agent that lets customers
          browse and place orders via WhatsApp. Multi-language, 24/7, UPI
          payments.
        </p>
      </SectionCard>

      <SectionCard id="signout" title="14. Profile & Sign Out">
        <StepList
          items={[
            'Go to Profile tab.',
            'Click "Sign Out".',
            'Redirected to homepage.',
          ]}
        />
      </SectionCard>

      <SectionCard id="trouble" title="15. Troubleshooting">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium">Problem</th>
                <th className="text-left py-2 font-medium">Solution</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-4">Store not visible</td>
                <td className="py-2">Must be approved by admin (24-48 hrs).</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">AI not processing</td>
                <td className="py-2">
                  Check daily limit. Images must be &lt;5MB.
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Wrong AI data</td>
                <td className="py-2">Edit manually before approving.</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-4">Can't upload docs</td>
                <td className="py-2">Use PDF/JPG/PNG, max 5MB.</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Language issues</td>
                <td className="py-2">Use globe icon to switch language.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}
