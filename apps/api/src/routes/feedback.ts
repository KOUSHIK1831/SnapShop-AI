import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { uuidSchema } from '@snapshop/shared';
import { notFound, forbidden } from '../lib/http-error';

export const feedbackRouter = Router();

const createFeedbackBody = z.object({
  message: z.string().trim().min(1).max(2000).optional(),
  content: z.string().trim().min(1).max(2000).optional(),
  sellerId: uuidSchema.optional(),
});

feedbackRouter.get('/', requireAuth, async (req, res) => {
  const actor = req.actor!;
  const where = actor.role === 'admin' ? {} : { userId: actor.id };
  const items = await prisma.feedback.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json({
    feedback: items.map(f => ({
      id: f.id,
      user_id: f.userId,
      seller_id: f.sellerId,
      content: f.content,
      message: f.content,
      status: f.status,
      admin_response: f.adminResponse,
      created_at: f.createdAt.toISOString(),
    })),
  });
});

feedbackRouter.post(
  '/',
  requireAuth,
  validate({ body: createFeedbackBody }),
  async (req, res) => {
    const actor = req.actor!;
    const content = req.valid.body.content || req.valid.body.message || '';
    const feedback = await prisma.feedback.create({
      data: {
        userId: actor.id,
        sellerId: req.valid.body.sellerId ?? null,
        content,
        status: 'open',
      },
    });

    res.status(201).json({
      feedback: {
        id: feedback.id,
        user_id: feedback.userId,
        seller_id: feedback.sellerId,
        content: feedback.content,
        message: feedback.content,
        status: feedback.status,
        created_at: feedback.createdAt.toISOString(),
      },
    });
  },
);

feedbackRouter.post(
  '/:id/respond',
  requireAuth,
  validate({
    params: z.object({ id: uuidSchema }),
    body: z.object({ response: z.string().trim().min(1).max(2000) }),
  }),
  async (req, res) => {
    if (req.actor?.role !== 'admin')
      throw forbidden('Only admins can respond to feedback');
    const existing = await prisma.feedback.findUnique({
      where: { id: req.valid.params.id },
    });
    if (!existing) throw notFound('Feedback not found');

    const updated = await prisma.feedback.update({
      where: { id: req.valid.params.id },
      data: {
        adminResponse: req.valid.body.response,
        status: 'resolved',
      },
    });

    res.json({ feedback: updated });
  },
);
