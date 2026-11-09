import { Router } from 'express';
import { z } from 'zod';
import { paginationSchema, uuidSchema } from '@snapshop/shared';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as products from '../repositories/products';

export const productsRouter = Router();

const variantBody = z.object({
  size: z.string().trim().min(1).max(30),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  priceOverride: z.number().min(0).max(10_000_000).nullable().optional(),
  sku: z.string().trim().max(80).nullable().optional(),
});

const productBody = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  price: z.number().min(0).max(10_000_000),
  discountPercent: z.number().min(0).max(100).optional(),
  category: z.string().trim().max(80).nullable().optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  imageUrl: z.string().trim().max(2000).nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  lowStockThreshold: z.number().int().min(0).max(10_000).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  variants: z.array(variantBody).max(30).optional(),
});

const listQuery = paginationSchema.extend({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  sellerId: uuidSchema.optional(),
  lowStock: z.coerce.boolean().optional(),
});

productsRouter.get(
  '/',
  requireAuth,
  requireRole('seller', 'admin'),
  validate({ query: listQuery }),
  async (req, res) => {
    res.json(
      await products.listOwnedProducts(req.actor!, {
        page: req.valid.query.page,
        pageSize: req.valid.query.pageSize,
        search: req.valid.query.search,
        status: req.valid.query.status,
        sellerId: req.valid.query.sellerId,
        lowStock: req.valid.query.lowStock,
      }),
    );
  },
);

productsRouter.post(
  '/',
  requireAuth,
  requireRole('seller'),
  validate({ body: productBody }),
  async (req, res) => {
    res.status(201).json({
      product: await products.createProduct(req.actor!, req.valid.body),
    });
  },
);

const bulkStockBody = z.object({
  items: z
    .array(
      z.object({
        id: uuidSchema,
        stock: z.number().int().min(0).max(1_000_000).optional(),
        variants: z
          .array(
            z.object({
              size: z.string().trim().min(1).max(30),
              stock: z.number().int().min(0).max(1_000_000),
            }),
          )
          .max(30)
          .optional(),
      }),
    )
    .min(1)
    .max(100),
});

productsRouter.patch(
  '/stock',
  requireAuth,
  requireRole('seller'),
  validate({ body: bulkStockBody }),
  async (req, res) => {
    res.json({
      products: await products.bulkUpdateStock(
        req.actor!,
        req.valid.body.items,
      ),
    });
  },
);

productsRouter.get(
  '/:id',
  requireAuth,
  requireRole('seller', 'admin'),
  validate({ params: z.object({ id: uuidSchema }) }),
  async (req, res) => {
    res.json({
      product: await products.getOwnedProduct(req.actor!, req.valid.params.id),
    });
  },
);

productsRouter.patch(
  '/:id',
  requireAuth,
  requireRole('seller'),
  validate({
    params: z.object({ id: uuidSchema }),
    body: productBody.partial(),
  }),
  async (req, res) => {
    res.json({
      product: await products.updateProduct(
        req.actor!,
        req.valid.params.id,
        req.valid.body,
      ),
    });
  },
);

productsRouter.delete(
  '/:id',
  requireAuth,
  requireRole('seller'),
  validate({ params: z.object({ id: uuidSchema }) }),
  async (req, res) => {
    res.json({
      product: await products.archiveProduct(req.actor!, req.valid.params.id),
    });
  },
);

productsRouter.post(
  '/:id/variants',
  requireAuth,
  requireRole('seller'),
  validate({
    params: z.object({ id: uuidSchema }),
    body: variantBody,
  }),
  async (req, res) => {
    res.status(201).json({
      product: await products.addVariant(
        req.actor!,
        req.valid.params.id,
        req.valid.body,
      ),
    });
  },
);

productsRouter.patch(
  '/:id/variants/:variantId',
  requireAuth,
  requireRole('seller'),
  validate({
    params: z.object({ id: uuidSchema, variantId: uuidSchema }),
    body: variantBody.partial(),
  }),
  async (req, res) => {
    res.json({
      product: await products.updateVariant(
        req.actor!,
        req.valid.params.id,
        req.valid.params.variantId,
        req.valid.body,
      ),
    });
  },
);

productsRouter.delete(
  '/:id/variants/:variantId',
  requireAuth,
  requireRole('seller'),
  validate({
    params: z.object({ id: uuidSchema, variantId: uuidSchema }),
  }),
  async (req, res) => {
    res.json({
      product: await products.deleteVariant(
        req.actor!,
        req.valid.params.id,
        req.valid.params.variantId,
      ),
    });
  },
);

const imageBody = z.object({
  storageKey: z.string().min(1).max(500),
  url: z.string().min(1).max(2000),
  position: z.number().int().min(0).max(100).optional(),
});

productsRouter.post(
  '/:id/images',
  requireAuth,
  requireRole('seller'),
  validate({
    params: z.object({ id: uuidSchema }),
    body: imageBody,
  }),
  async (req, res) => {
    res.status(201).json({
      product: await products.addImage(
        req.actor!,
        req.valid.params.id,
        req.valid.body,
      ),
    });
  },
);

productsRouter.delete(
  '/:id/images/:imageId',
  requireAuth,
  requireRole('seller'),
  validate({
    params: z.object({ id: uuidSchema, imageId: uuidSchema }),
  }),
  async (req, res) => {
    res.json({
      product: await products.deleteImage(
        req.actor!,
        req.valid.params.id,
        req.valid.params.imageId,
      ),
    });
  },
);
