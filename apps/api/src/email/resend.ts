import { Resend } from 'resend';
import { env } from '../config/env';
import type { EmailAdapter, EmailMessage } from './types';

/** Production driver (free tier: 3,000 emails/month, 100/day). */
export class ResendEmailAdapter implements EmailAdapter {
  private readonly client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  async send(message: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send({
      from: env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (error) {
      throw new Error(`Resend rejected the email: ${error.message}`);
    }
  }
}
