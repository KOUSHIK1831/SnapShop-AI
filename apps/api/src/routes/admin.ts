import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { notFound, badRequest } from '../lib/http-error';
import { storage } from '../storage';
import {
  orderDto,
  productDto,
  sellerDto,
  storageKeyForSellerReference,
} from '../lib/dto';

export const adminRouter = Router();

// Require admin role for all admin routes
adminRouter.use(requireAuth, requireRole('admin'));

// ── GET /admin/overview — Dashboard stats, profiles, sellers, logs ────────
adminRouter.get('/overview', async (_req, res) => {
  const [
    users,
    sellers,
    totalProducts,
    totalOrders,
    feedbackItems,
    notificationLogs,
    auditLogs,
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        email: true,
        role: true,
        isBlocked: true,
        name: true,
        createdAt: true,
      },
    }),
    prisma.seller.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        _count: {
          select: { products: true, orders: true },
        },
      },
    }),
    prisma.product.count(),
    prisma.order.count(),
    prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { email: true } },
        seller: { select: { storeName: true } },
      },
    }),
    prisma.notificationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  const profiles = users.map(u => ({
    id: u.id,
    email: u.email,
    role: u.role,
    status: u.isBlocked ? 'blocked' : 'active',
    is_blocked: u.isBlocked,
    full_name: u.name,
    created_at: u.createdAt.toISOString(),
  }));

  const sellersDto = sellers.map(s => ({
    id: s.id,
    user_id: s.userId,
    store_name: s.storeName,
    store_slug: s.storeSlug,
    location: s.location,
    status: s.status,
    phone: s.phone,
    contact_number: s.contactNumber,
    verification_status: s.verificationStatus,
    verification_documents: s.verificationDocuments,
    admin_feedback: s.adminFeedback,
    ai_daily_limit: s.aiDailyLimit,
    gstin: s.gstin,
    registered_business_name: s.registeredBusinessName,
    created_at: s.createdAt.toISOString(),
    product_count: s._count.products,
    order_count: s._count.orders,
  }));

  const feedbackDto = feedbackItems.map(f => ({
    id: f.id,
    user_id: f.userId,
    seller_id: f.sellerId,
    content: f.content,
    status: f.status,
    admin_response: f.adminResponse,
    created_at: f.createdAt.toISOString(),
    user_email: f.user?.email,
    store_name: f.seller?.storeName,
  }));

  const notificationLogsDto = notificationLogs.map(n => ({
    id: n.id,
    email: n.email,
    type: n.type,
    status: n.status,
    error: n.error,
    created_at: n.createdAt.toISOString(),
  }));

  const auditLogsDto = auditLogs.map(a => ({
    id: a.id,
    action: a.action,
    entity: a.entity,
    entity_id: a.entityId,
    actor_id: a.actorId,
    metadata: a.metadata,
    created_at: a.createdAt.toISOString(),
  }));

  res.json({
    profiles,
    sellers: sellersDto,
    totalProducts,
    totalOrders,
    feedback: feedbackDto,
    notificationLogs: notificationLogsDto,
    auditLogs: auditLogsDto,
  });
});

// ── GET /admin/sellers — List sellers ──────────────────────────────────────
adminRouter.get('/sellers', async (_req, res) => {
  const sellers = await prisma.seller.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { email: true, name: true } },
      _count: { select: { products: true, orders: true } },
    },
  });

  res.json({ sellers });
});

// ── GET /admin/sellers/:id — Get seller details ────────────────────────────
adminRouter.get('/sellers/:id', async (req, res) => {
  const seller = await prisma.seller.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { email: true, name: true, phone: true } },
      products: {
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { variants: true, images: { orderBy: { position: 'asc' } } },
      },
      orders: {
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: true } },
          seller: true,
          buyer: true,
          events: { orderBy: { createdAt: 'asc' } },
        },
      },
    },
  });
  if (!seller) throw notFound('Seller not found');
  res.json({
    seller: await sellerDto(seller, { includeVerificationDocuments: true }),
    products: seller.products.map(productDto),
    orders: await Promise.all(
      seller.orders.map(order =>
        orderDto(order, { includeBuyer: true, includePaymentProof: true }),
      ),
    ),
  });
});

// ── PATCH /admin/sellers/:id/verify — Approve or reject verification ──────
const verifyBody = z.object({
  status: z.enum(['approved', 'rejected']),
  feedback: z.string().optional(),
});

adminRouter.patch(
  '/sellers/:id/verify',
  validate({ body: verifyBody }),
  async (req, res) => {
    const { status, feedback } = req.valid.body;

    const seller = await prisma.seller.update({
      where: { id: req.params.id as string },
      data: {
        verificationStatus: status,
        adminFeedback: feedback ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.actor!.id,
        action: `seller.verification.${status}`,
        entity: 'seller',
        entityId: seller.id,
        metadata: { feedback },
      },
    });

    res.json({ seller });
  },
);

// ── PATCH /admin/sellers/:id/limit — Update AI daily limit ────────────────
const limitBody = z.object({
  limit: z.number().int().min(1).max(500),
});

adminRouter.patch(
  '/sellers/:id/limit',
  validate({ body: limitBody }),
  async (req, res) => {
    const seller = await prisma.seller.update({
      where: { id: req.params.id as string },
      data: { aiDailyLimit: req.valid.body.limit },
    });
    res.json({ seller });
  },
);

// ── DELETE /admin/products/:id — Remove product ───────────────────────────
adminRouter.delete('/products/:id', async (req, res) => {
  await prisma.product.delete({
    where: { id: req.params.id as string },
  });

  await prisma.auditLog.create({
    data: {
      actorId: req.actor!.id,
      action: 'product.delete',
      entity: 'product',
      entityId: req.params.id as string,
    },
  });

  res.json({ success: true });
});

// ── Feedback management ───────────────────────────────────────────────────
adminRouter.patch(
  '/feedback/:id',
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
      status: z.enum(['open', 'in_review', 'resolved']).optional(),
      response: z.string().trim().max(2000).nullable().optional(),
    }),
  }),
  async (req, res) => {
    if (
      req.valid.body.status === undefined &&
      req.valid.body.response === undefined
    ) {
      throw badRequest('A feedback status or response is required');
    }

    const feedback = await prisma.feedback.update({
      where: { id: req.valid.params.id },
      data: {
        ...(req.valid.body.status !== undefined
          ? { status: req.valid.body.status }
          : {}),
        ...(req.valid.body.response !== undefined
          ? { adminResponse: req.valid.body.response }
          : {}),
      },
    });

    res.json({ feedback });
  },
);

adminRouter.delete('/feedback/:id', async (req, res) => {
  await prisma.feedback.delete({
    where: { id: req.params.id },
  });
  res.json({ success: true });
});

// ── Document signed URL generation ────────────────────────────────────────
export async function getVerificationDocumentDownload(key: string) {
  if (!key) throw badRequest('key is required');

  const seller = await prisma.seller.findFirst({
    where: { verificationDocuments: { has: key } },
    select: { id: true, verificationDocuments: true },
  });
  if (!seller) throw notFound('Verification document not found');

  const storedReference = seller.verificationDocuments.find(
    document => document === key,
  );
  const storageKey = storageKeyForSellerReference(
    storedReference ?? null,
    seller.id,
  );
  if (!storageKey) throw notFound('Verification document not found');

  return storage.presignGet(storageKey);
}

adminRouter.get('/documents/signed-url', async (req, res) => {
  const key = typeof req.query.key === 'string' ? req.query.key : '';
  const { url, expiresIn } = await getVerificationDocumentDownload(key);
  res.json({ url, expires_in: expiresIn });
});

// ── User block / unblock ──────────────────────────────────────────────────
const blockUserBody = z.object({
  blocked: z.boolean(),
});

adminRouter.patch(
  '/users/:id/block',
  validate({ body: blockUserBody }),
  async (req, res) => {
    const { blocked } = req.valid.body;
    const userId = req.params.id as string;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: blocked },
    });

    const seller = await prisma.seller.findUnique({
      where: { userId },
    });

    if (seller) {
      await prisma.seller.update({
        where: { id: seller.id },
        data: { status: blocked ? 'blocked' : 'active' },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: req.actor!.id,
        action: blocked ? 'user.block' : 'user.unblock',
        entity: 'user',
        entityId: user.id,
      },
    });

    const io = req.app.get('io');
    if (io && blocked) {
      io.to(`user:${user.id}`).emit('user:blocked', { userId: user.id });
    }

    res.json({ user });
  },
);

// ── Seller store status ───────────────────────────────────────────────────
const sellerStatusBody = z.object({
  status: z.enum(['active', 'blocked']),
});

adminRouter.patch(
  '/sellers/:id/status',
  validate({ body: sellerStatusBody }),
  async (req, res) => {
    const { status } = req.valid.body;
    const sellerId = req.params.id as string;

    const seller = await prisma.seller.update({
      where: { id: sellerId },
      data: { status },
      include: { user: true },
    });

    const isBlocked = status === 'blocked';
    await prisma.user.update({
      where: { id: seller.userId },
      data: { isBlocked },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.actor!.id,
        action: `seller.status.${status}`,
        entity: 'seller',
        entityId: seller.id,
      },
    });

    res.json({ seller });
  },
);
