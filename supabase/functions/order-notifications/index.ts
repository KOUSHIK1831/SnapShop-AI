// supabase/functions/order-notifications/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface OrderRecord {
  id: string;
  status: string;
  pay_status: string;
  pay_method: string;
  buyer_id: string;
  buyer_phone: string;
  buyer_name: string;
  seller_id: string;
  product_id: string;
  unit_price: number;
}

async function logNotification(
  entityId: string,
  email: string,
  type: string,
  status: 'sent' | 'failed',
  error?: string,
) {
  try {
    await supabase.from('notification_logs').insert({
      entity_type: 'order',
      entity_id: entityId,
      recipient_email: email,
      notification_type: type,
      status,
      error_message: error,
      attempts: 1,
      last_attempted_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to log notification:', err);
  }
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  entityId: string,
  type: string,
) {
  if (!RESEND_API_KEY) {
    console.warn('Resend API key not set. Skipping email.');
    await logNotification(
      entityId,
      to,
      type,
      'failed',
      'RESEND_API_KEY missing',
    );
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SnapShop AI <notifications@snapshop.store>',
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (res.ok) {
      await logNotification(entityId, to, type, 'sent');
    } else {
      const errData = await res.json();
      await logNotification(
        entityId,
        to,
        type,
        'failed',
        JSON.stringify(errData),
      );
    }
  } catch (err) {
    await logNotification(
      entityId,
      to,
      type,
      'failed',
      err instanceof Error ? err.message : 'Unknown error',
    );
  }
}

Deno.serve(async req => {
  try {
    const payload = await req.json();
    const { record, old_record, type } = payload;
    const newOrder = record as OrderRecord;

    // Fetch store name and product title
    const { data: seller } = await supabase
      .from('sellers')
      .select('store_name, user_id, phone')
      .eq('id', newOrder.seller_id)
      .single();

    const { data: product } = await supabase
      .from('products')
      .select('title')
      .eq('id', newOrder.product_id)
      .single();

    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', newOrder.buyer_id)
      .single();

    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', seller?.user_id)
      .single();

    const storeName = seller?.store_name || 'SnapShop AI Store';
    const productTitle = product?.title || 'your order';
    const buyerEmail = buyerProfile?.email;
    const sellerEmail = sellerProfile?.email;
    const trackLink = `https://snapshop.store/track-order/${newOrder.id}`;
    const dashboardLink = `https://snapshop.store/dashboard?tab=products&sub=orders`;

    // ── HANDLE NEW ORDER (INSERT) ──
    if (type === 'INSERT') {
      if (sellerEmail) {
        await sendEmail(
          sellerEmail,
          `New Order Received - ${storeName}`,
          `<p>Congratulations! You have a new order for <strong>${productTitle}</strong>.</p>
           <p><strong>Buyer:</strong> ${newOrder.buyer_name}</p>
           <p><strong>Amount:</strong> ₹${newOrder.unit_price}</p>
           <p><strong>Payment:</strong> ${newOrder.pay_method} (${newOrder.pay_status})</p>
           <p><a href="${dashboardLink}">View and manage this order in your dashboard.</a></p>`,
          newOrder.id,
          'new_order_seller',
        );
      }
      return new Response('New order notification processed', { status: 200 });
    }

    // ── HANDLE UPDATES ──
    if (type === 'UPDATE') {
      const oldOrder = old_record as OrderRecord;
      let buyerSubject = '';
      let buyerHtml = '';
      let nType = '';

      // 1. Check for fulfillment status change
      if (newOrder.status !== oldOrder.status) {
        nType = `order_status_${newOrder.status}`;
        switch (newOrder.status) {
          case 'accepted':
          case 'confirmed':
            buyerSubject = `Order Accepted - ${storeName}`;
            buyerHtml = `<p>Hi ${newOrder.buyer_name},</p><p>Your order for <strong>${productTitle}</strong> has been accepted by <strong>${storeName}</strong>!</p><p><a href="${trackLink}">Track your order here</a></p>`;
            break;
          case 'preparing':
            buyerSubject = `Order is being prepared - ${storeName}`;
            buyerHtml = `<p>Hi ${newOrder.buyer_name}, the seller is now preparing your order for <strong>${productTitle}</strong>.</p>`;
            break;
          case 'ready_for_dispatch':
            buyerSubject = `Order ready for dispatch - ${storeName}`;
            buyerHtml = `<p>Hi ${newOrder.buyer_name}, your order for <strong>${productTitle}</strong> is packed and ready to be shipped!</p>`;
            break;
          case 'shipped':
            buyerSubject = `Order Shipped - ${storeName}`;
            buyerHtml = `<p>Great news ${newOrder.buyer_name}!</p><p>Your order for <strong>${productTitle}</strong> has been shipped.</p><p><a href="${trackLink}">Click here to track your package.</a></p>`;
            break;
          case 'out_for_delivery':
            buyerSubject = `Out for Delivery - ${storeName}`;
            buyerHtml = `<p>Your order for <strong>${productTitle}</strong> is out for delivery! You should receive it shortly.</p>`;
            break;
          case 'delivered':
            buyerSubject = `Order Delivered - ${storeName}`;
            buyerHtml = `<p>Success! Your order for <strong>${productTitle}</strong> from <strong>${storeName}</strong> has been delivered.</p>`;
            break;
          case 'cancelled':
            buyerSubject = `Order Cancelled - ${storeName}`;
            buyerHtml = `<p>We're sorry, but your order for <strong>${productTitle}</strong> has been cancelled. Please contact the seller for more information.</p>`;
            break;
        }
      }

      // 2. Check for payment status change
      if (newOrder.pay_status !== oldOrder.pay_status) {
        nType = `pay_status_${newOrder.pay_status}`;
        if (newOrder.pay_status === 'paid') {
          buyerSubject = `Payment Confirmed - ${storeName}`;
          buyerHtml = `<p>Hi ${newOrder.buyer_name}, your payment for order <strong>${newOrder.id.slice(0, 8)}</strong> has been verified and confirmed as <strong>Paid</strong>.</p><p>Thank you for shopping with ${storeName}!</p>`;
        } else if (newOrder.pay_status === 'failed') {
          buyerSubject = `Payment Failed - ${storeName}`;
          buyerHtml = `<p>Hi ${newOrder.buyer_name}, we were unable to verify your payment for order <strong>${newOrder.id.slice(0, 8)}</strong>. Please check your payment details or contact the seller.</p>`;
        }
      }

      if (buyerEmail && buyerSubject) {
        await sendEmail(
          buyerEmail,
          buyerSubject,
          buyerHtml,
          newOrder.id,
          nType,
        );
      }

      return new Response('Update notification processed', { status: 200 });
    }

    return new Response('No action taken', { status: 200 });
  } catch (err) {
    console.error('Error in order-notifications:', err);
    return new Response('Internal Error', { status: 500 });
  }
});
