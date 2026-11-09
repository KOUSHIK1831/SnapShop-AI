import { env } from '../config/env';
import { email } from '../email';
import { logger } from '../lib/logger';

const appLink = (path: string) => `${env.APP_URL.replace(/\/$/, '')}${path}`;
const apiLink = (path: string) =>
  `${env.API_PUBLIC_URL.replace(/\/$/, '')}${path}`;

export function verificationLink(token: string): string {
  return appLink(`/verify-email?token=${encodeURIComponent(token)}`);
}

export function passwordResetLink(token: string): string {
  return appLink(`/reset-password?token=${encodeURIComponent(token)}`);
}

export function storeLink(slug: string): string {
  return appLink(`/store/${slug}`);
}

export function trackingLink(token: string): string {
  return appLink(`/track/${token}`);
}

export function apiHealthLink(): string {
  return apiLink('/health');
}

async function safeSend(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  try {
    await email.send(input);
  } catch (error) {
    logger.error({ err: error, to: input.to }, 'Failed to send email');
  }
}

export async function sendVerificationEmail(
  to: string,
  name: string | null,
  token: string,
): Promise<void> {
  const link = verificationLink(token);
  await safeSend({
    to,
    subject: 'Verify your SnapShop AI email',
    text: `Hi ${name ?? 'there'},\n\nVerify your email to finish setting up SnapShop AI:\n${link}\n\nThis link expires in 24 hours.`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
        <h2>Welcome to SnapShop AI</h2>
        <p>Hi ${name ?? 'there'},</p>
        <p>Verify your email to finish setting up your account.</p>
        <p><a href="${link}" style="background:#8B5CF6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Verify email</a></p>
        <p style="color:#666;font-size:13px">This link expires in 24 hours. If you did not create an account, ignore this email.</p>
      </div>`,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string | null,
  token: string,
): Promise<void> {
  const link = passwordResetLink(token);
  await safeSend({
    to,
    subject: 'Reset your SnapShop AI password',
    text: `Hi ${name ?? 'there'},\n\nReset your password here:\n${link}\n\nThis link expires in 1 hour. If you did not request it, ignore this email.`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
        <h2>Reset your password</h2>
        <p>Hi ${name ?? 'there'},</p>
        <p>Click the button below to choose a new password.</p>
        <p><a href="${link}" style="background:#8B5CF6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Reset password</a></p>
        <p style="color:#666;font-size:13px">This link expires in 1 hour. If you did not request it, ignore this email.</p>
      </div>`,
  });
}

export async function sendSellerInviteEmail(input: {
  to: string;
  storeName: string;
  token: string;
  volunteerName: string;
}): Promise<void> {
  const link = passwordResetLink(input.token);
  await safeSend({
    to: input.to,
    subject: `${input.volunteerName} invited you to SnapShop AI`,
    text: `Your store "${input.storeName}" is ready on SnapShop AI.\n\nSet your password to start selling:\n${link}\n\nThis link expires in 24 hours.`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
        <h2>Your store is ready 🎉</h2>
        <p><strong>${input.storeName}</strong> was created for you on SnapShop AI.</p>
        <p>Set a password to start adding products:</p>
        <p><a href="${link}" style="background:#8B5CF6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Set password</a></p>
        <p style="color:#666;font-size:13px">This link expires in 24 hours.</p>
      </div>`,
  });
}

export async function sendOrderStatusEmail(input: {
  to: string;
  buyerName: string | null;
  orderNumber: string;
  status: string;
  trackUrl: string;
}): Promise<void> {
  await safeSend({
    to: input.to,
    subject: `Order ${input.orderNumber} is now ${input.status.replaceAll('_', ' ')}`,
    text: `Hi ${input.buyerName ?? 'there'},\n\nYour order ${input.orderNumber} is now ${input.status.replaceAll('_', ' ')}.\n\nTrack it here: ${input.trackUrl}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
        <h2>Order update</h2>
        <p>Hi ${input.buyerName ?? 'there'},</p>
        <p>Your order <strong>${input.orderNumber}</strong> is now <strong>${input.status.replaceAll('_', ' ')}</strong>.</p>
        <p><a href="${input.trackUrl}" style="background:#8B5CF6;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Track order</a></p>
      </div>`,
  });
}

export async function sendNewOrderEmail(input: {
  to: string;
  storeName: string;
  orderNumber: string;
  total: string;
}): Promise<void> {
  await safeSend({
    to: input.to,
    subject: `New order ${input.orderNumber} for ${input.storeName}`,
    text: `You received a new order ${input.orderNumber} worth ₹${input.total}. Open your SnapShop dashboard to review it.`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
        <h2>New order 🛍️</h2>
        <p><strong>${input.storeName}</strong> received order <strong>${input.orderNumber}</strong> worth <strong>₹${input.total}</strong>.</p>
        <p>Open your dashboard to accept it.</p>
      </div>`,
  });
}
