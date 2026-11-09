import { env } from '../config/env';
import { ConsoleEmailAdapter } from './console';
import { ResendEmailAdapter } from './resend';
import type { EmailAdapter } from './types';

function createEmailAdapter(): EmailAdapter {
  if (env.EMAIL_DRIVER === 'resend') {
    if (!env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is required when EMAIL_DRIVER=resend');
    }
    return new ResendEmailAdapter(env.RESEND_API_KEY);
  }

  return new ConsoleEmailAdapter();
}

export const email: EmailAdapter = createEmailAdapter();
export type { EmailAdapter, EmailMessage } from './types';
