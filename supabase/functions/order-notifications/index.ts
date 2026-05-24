// supabase/functions/order-notifications/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY    = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface OrderRecord {
  id: string;
  status: string;
  buyer_id: string;
  buyer_phone: string;
  buyer_name: string;
  seller_id: string;
  product_id: string;
  tracking_provider?: string;
  tracking_number?: string;
  delivery_person_name?: string;
  delivery_person_phone?: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn("Resend API key not set. Skipping email.");
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "ApnaBazar <notifications@apnabazar.store>",
      to: [to],
      subject: subject,
      html: html,
    }),
  });
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { record, old_record, type } = payload;
    const newOrder = record as OrderRecord;

    // Fetch store name and product title
    const { data: seller } = await supabase.from('sellers').select('store_name, user_id').eq('id', newOrder.seller_id).single();
    const { data: product } = await supabase.from('products').select('title').eq('id', newOrder.product_id).single();
    const { data: buyerProfile } = await supabase.from('profiles').select('email').eq('id', newOrder.buyer_id).single();

    const storeName = seller?.store_name || "ApnaBazar Store";
    const productTitle = product?.title || "your order";
    const buyerEmail = buyerProfile?.email;
    const trackLink = `https://apnabazar.store/track-order/${newOrder.id}`;

    // ── HANDLE NEW ORDER (INSERT) ──
    if (type === 'INSERT') {
      // New order received - can send seller email here if needed
      return new Response("New order received", { status: 200 });
    }

    // ── HANDLE STATUS UPDATE (UPDATE) ──
    if (type === 'UPDATE') {
      const oldOrder = old_record as OrderRecord;
      if (newOrder.status === oldOrder.status) {
        return new Response("Status unchanged", { status: 200 });
      }

      let emailSubject = "";
      let emailHtml = "";

      switch (newOrder.status) {
        case 'accepted':
        case 'confirmed':
          emailSubject = `Order Accepted - ApnaBazar`;
          emailHtml = `<p>Hi ${newOrder.buyer_name},</p><p>Your order for <strong>${productTitle}</strong> has been accepted by <strong>${storeName}</strong>!</p><p><a href="${trackLink}">Track your order here</a></p>`;
          break;
        case 'shipped':
          emailSubject = `Order Shipped - ApnaBazar`;
          emailHtml = `<p>Great news ${newOrder.buyer_name}!</p><p>Your order for <strong>${productTitle}</strong> has been shipped.</p><p><a href="${trackLink}">Click here to track your package.</a></p>`;
          break;
        case 'out_for_delivery':
          emailSubject = `Out for Delivery - ApnaBazar`;
          emailHtml = `<p>Your order for <strong>${productTitle}</strong> is out for delivery! You should receive it shortly.</p>`;
          break;
        case 'delivered':
          emailSubject = `Order Delivered - ApnaBazar`;
          emailHtml = `<p>Success! Your order for <strong>${productTitle}</strong> from <strong>${storeName}</strong> has been delivered.</p>`;
          break;
        case 'cancelled':
          emailSubject = `Order Cancelled - ApnaBazar`;
          emailHtml = `<p>We're sorry, but your order for <strong>${productTitle}</strong> has been cancelled. Please contact the seller for more information.</p>`;
          break;
      }

      if (buyerEmail && emailSubject) {
        await sendEmail(buyerEmail, emailSubject, emailHtml);
      }

      return new Response("Email notification sent", { status: 200 });
    }

    return new Response("Skipping event", { status: 200 });
  } catch (err) {
    console.error("Error sending notification:", err);
    return new Response("Internal Error", { status: 500 });
  }
});
