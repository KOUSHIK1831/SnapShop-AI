// supabase/functions/seller-notifications/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface SellerRecord {
  id: string;
  user_id: string;
  store_name: string;
  verification_status: string;
  admin_feedback?: string;
}

async function logNotification(
  entityId: string,
  email: string,
  type: string,
  status: 'sent' | 'failed',
  error?: string
) {
  try {
    await supabase.from('notification_logs').insert({
      entity_type: 'seller',
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

async function sendEmail(to: string, subject: string, html: string, entityId: string, type: string) {
  if (!RESEND_API_KEY) {
    console.warn('Resend API key not set. Skipping email.');
    await logNotification(entityId, to, type, 'failed', 'RESEND_API_KEY missing');
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
      await logNotification(entityId, to, type, 'failed', JSON.stringify(errData));
    }
  } catch (err) {
    await logNotification(entityId, to, type, 'failed', err instanceof Error ? err.message : 'Unknown error');
  }
}

Deno.serve(async req => {
  try {
    const payload = await req.json();
    const { record, old_record, type } = payload;
    const newSeller = record as SellerRecord;

    if (type !== 'UPDATE') return new Response('Not an update', { status: 200 });
    
    const oldSeller = old_record as SellerRecord;
    if (newSeller.verification_status === oldSeller.verification_status) {
      return new Response('Status unchanged', { status: 200 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', newSeller.user_id)
      .single();

    if (!profile?.email) return new Response('No email found', { status: 200 });

    let subject = '';
    let html = '';
    const nType = `seller_verification_${newSeller.verification_status}`;

    if (newSeller.verification_status === 'approved') {
      subject = 'Welcome to SnapShop AI! Your Store is Approved';
      html = `<h1>Congratulations!</h1><p>Your store <strong>${newSeller.store_name}</strong> has been approved. You can now start uploading products and receiving orders.</p><p><a href="https://snapshop.store/dashboard">Go to your dashboard</a></p>`;
    } else if (newSeller.verification_status === 'rejected') {
      subject = 'Update on your Store Verification';
      html = `<h1>Verification Update</h1><p>We have reviewed your store <strong>${newSeller.store_name}</strong> and unfortunately, we couldn't approve it at this time.</p><p><strong>Feedback from Admin:</strong> ${newSeller.admin_feedback || 'No specific feedback provided.'}</p><p>Please update your details and resubmit for verification.</p>`;
    }

    if (subject) {
      await sendEmail(profile.email, subject, html, newSeller.id, nType);
    }

    return new Response('Seller notification sent', { status: 200 });
  } catch (err) {
    console.error('Error in seller-notifications:', err);
    return new Response('Internal Error', { status: 500 });
  }
});
