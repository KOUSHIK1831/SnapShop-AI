import { Router } from 'express';
import { z } from 'zod';
import { uuidSchema } from '@snapshop/shared';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as cart from '../repositories/cart';

export const cartRouter = Router();

cartRouter.use(requireAuth, requireRole('buyer'));

cartRouter.get('/', async (req, res) => {
  res.json({ cart: await cart.getCart(req.actor!) });
});

cartRouter.post(
  '/items',
  validate({
    body: z.object({
      productId: uuidSchema,
      variantId: uuidSchema.nullable().optional(),
      quantity: z.number().int().min(1).max(99),
    }),
  }),
  async (req, res) => {
    res
      .status(201)
      .json({ cart: await cart.addCartItem(req.actor!, req.valid.body) });
  },
);

cartRouter.patch(
  '/items/:id',
  validate({
    params: z.object({ id: uuidSchema }),
    body: z.object({ quantity: z.number().int().min(0).max(99) }),
  }),
  async (req, res) => {
    res.json({
      cart: await cart.updateCartItem(
        req.actor!,
        req.valid.params.id,
        req.valid.body.quantity,
      ),
    });
  },
);

cartRouter.delete(
  '/items/:id',
  validate({ params: z.object({ id: uuidSchema }) }),
  async (req, res) => {
    res.json({
      cart: await cart.removeCartItem(req.actor!, req.valid.params.id),
    });
  },
);

cartRouter.delete('/', async (req, res) => {
  res.json({ cart: await cart.clearCart(req.actor!) });
});
