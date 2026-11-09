import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { forbidden, notFound } from '../lib/http-error';
import {
  runWhatsAppAgent,
  sendWhatsAppTextMessage,
} from '../services/whatsapp/agent';

export const whatsappRouter = Router();

// ── GET: Webhook verification from Meta ──────────────────────────────────
whatsappRouter.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = env.WHATSAPP_VERIFY_TOKEN || 'snapshop-verify-token';

  if (mode === 'subscribe' && token === expectedToken) {
    return res.status(200).send(challenge);
  }

  throw forbidden('Invalid WhatsApp verification token');
});

// ── POST: Incoming WhatsApp message webhook ──────────────────────────────
whatsappRouter.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0]?.value;

    if (!changes?.messages || !changes.messages.length) {
      return res.status(200).json({ status: 'ignored' });
    }

    const message = changes.messages[0];
    const phone = message.from;

    if (message.type !== 'text') {
      await sendWhatsAppTextMessage(
        phone,
        'Sorry, I can only process text messages right now. Please type your query! 😊',
      );
      return res.status(200).json({ status: 'ok' });
    }

    const userText = message.text.body;

    // Resolve store slug from display_phone_number or metadata or fallback
    const displayPhone = changes.metadata?.display_phone_number;
    let seller = displayPhone
      ? await prisma.seller.findFirst({
          where: {
            OR: [{ phone: displayPhone }, { contactNumber: displayPhone }],
          },
        })
      : null;

    if (!seller) {
      // Fallback to first verified seller or default
      seller = await prisma.seller.findFirst({
        where: { verificationStatus: 'approved' },
      });
    }

    const storeSlug = seller?.storeSlug || 'default-store';

    // Run agent in background so Meta webhook doesn't timeout
    runWhatsAppAgent(phone, userText, storeSlug)
      .then(reply => sendWhatsAppTextMessage(phone, reply))
      .catch(err => console.error('Error running WhatsApp agent:', err));

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    return res.status(200).json({ status: 'error' });
  }
});

// ── GET: Conversations for seller ────────────────────────────────────────
whatsappRouter.get(
  '/conversations',
  requireAuth,
  requireRole('seller', 'admin'),
  async (req, res) => {
    const seller = await prisma.seller.findUnique({
      where: { userId: req.actor!.id },
    });
    if (!seller || !seller.storeSlug) throw notFound('Store not found');

    const conversations = await prisma.conversation.findMany({
      where: { storeSlug: seller.storeSlug },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    res.json({ conversations });
  },
);

// ── POST: Send manual message or test message ────────────────────────────
const sendBody = z.object({
  to: z.string().min(5),
  message: z.string().min(1),
});

whatsappRouter.post(
  '/send',
  requireAuth,
  requireRole('seller', 'admin'),
  validate({ body: sendBody }),
  async (req, res) => {
    const result = await sendWhatsAppTextMessage(
      req.valid.body.to,
      req.valid.body.message,
    );
    res.json({ success: true, result });
  },
);
