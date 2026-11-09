import { logger } from '../lib/logger';
import type { EmailAdapter, EmailMessage } from './types';

/**
 * Development driver: prints the email instead of sending it.
 * Verification and password-reset links are visible in the API logs.
 */
export class ConsoleEmailAdapter implements EmailAdapter {
  async send(message: EmailMessage): Promise<void> {
    logger.info(
      {
        email: {
          to: message.to,
          subject: message.subject,
          text: message.text ?? message.html,
        },
      },
      'Email (console driver — not sent)',
    );
  }
}
