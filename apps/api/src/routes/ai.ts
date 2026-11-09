import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { notFound } from '../lib/http-error';
import {
  checkAiDailyLimit,
  digitizeProductImage,
} from '../services/ai/digitize';

export const aiRouter = Router();

const digitizeBody = z.object({
  imageUrl: z.string().min(1, 'imageUrl is required'),
  sellerId: z.string().uuid().optional(),
});

aiRouter.post(
  '/digitize',
  requireAuth,
  requireRole('seller', 'admin'),
  validate({ body: digitizeBody }),
  async (req, res) => {
    let sellerId = req.valid.body.sellerId;

    if (!sellerId) {
      const seller = await prisma.seller.findUnique({
        where: { userId: req.actor!.id },
      });
      if (!seller) throw notFound('Seller profile not found for this user');
      sellerId = seller.id;
    }

    const { product, provider } = await digitizeProductImage(
      req.valid.body.imageUrl,
      sellerId,
    );

    const usage = await checkAiDailyLimit(sellerId);

    res.json({
      product,
      provider,
      usage: {
        today: usage.count,
        limit: usage.limit,
        remaining: usage.remaining,
      },
    });
  },
);

aiRouter.get(
  '/usage',
  requireAuth,
  requireRole('seller', 'admin'),
  async (req, res) => {
    const seller = await prisma.seller.findUnique({
      where: { userId: req.actor!.id },
    });
    if (!seller) throw notFound('Seller profile not found');

    const usage = await checkAiDailyLimit(seller.id);

    res.json({
      usageToday: usage.count,
      dailyLimit: usage.limit,
      remaining: usage.remaining,
    });
  },
);
