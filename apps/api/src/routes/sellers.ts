import { Router } from 'express';
import { z } from 'zod';
import { paginationSchema } from '@snapshop/shared';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as sellers from '../repositories/sellers';

export const sellersRouter = Router();

const nullableText = (max: number) =>
  z.string().trim().max(max).nullable().optional();

const sellerBody = z.object({
  fullName: nullableText(120),
  storeName: nullableText(120),
  storeSlug: nullableText(80),
  storeDescription: nullableText(2000),
  storeNumber: nullableText(40),
  location: nullableText(200),
  phone: nullableText(20),
  contactNumber: nullableText(20),
  mapsUrl: nullableText(500),
  bannerUrl: nullableText(2000),
  themeColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/)
    .optional(),
  gstin: nullableText(20),
  registeredBusinessName: nullableText(200),
  sellerUpiId: z
    .string()
    .trim()
    .regex(/^[\w.\-]{2,}@[a-zA-Z]{2,}$/)
    .nullable()
    .optional(),
  preferredPaymentMethod: z.enum(['upi', 'razorpay', 'both']).optional(),
  verificationDocuments: z.array(z.string().max(2000)).max(10).optional(),
});

sellersRouter.get(
  '/me',
  requireAuth,
  requireRole('seller', 'admin'),
  async (req, res) => {
    res.json({ seller: await sellers.getMySeller(req.actor!) });
  },
);

sellersRouter.post(
  '/me',
  requireAuth,
  requireRole('seller'),
  validate({ body: sellerBody }),
  async (req, res) => {
    res
      .status(201)
      .json({ seller: await sellers.saveMySeller(req.actor!, req.valid.body) });
  },
);

sellersRouter.patch(
  '/me',
  requireAuth,
  requireRole('seller'),
  validate({ body: sellerBody }),
  async (req, res) => {
    res.json({
      seller: await sellers.saveMySeller(req.actor!, req.valid.body),
    });
  },
);

sellersRouter.post(
  '/me/submit',
  requireAuth,
  requireRole('seller'),
  async (req, res) => {
    res.json({ seller: await sellers.submitMySeller(req.actor!) });
  },
);

sellersRouter.get('/', async (_req, res) => {
  res.json({ sellers: await sellers.listPublicSellers() });
});

const productQuery = paginationSchema.extend({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
});

sellersRouter.get(
  '/:slug/products',
  validate({ query: productQuery }),
  async (req, res) => {
    res.json(
      await sellers.listPublicProducts(String(req.params.slug), {
        page: req.valid.query.page,
        pageSize: req.valid.query.pageSize,
        search: req.valid.query.search,
        category: req.valid.query.category,
      }),
    );
  },
);

sellersRouter.get('/:slug/categories', async (req, res) => {
  res.json({
    categories: await sellers.listCategories(String(req.params.slug)),
  });
});

sellersRouter.get('/:slug', async (req, res) => {
  res.json({ seller: await sellers.getPublicSeller(String(req.params.slug)) });
});
