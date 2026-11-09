import { Router } from 'express';
import { z } from 'zod';
import { paginationSchema, uuidSchema } from '@snapshop/shared';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as orders from '../repositories/orders';

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

const addressSchema = z
  .union([z.string().trim().max(2000), z.record(z.string(), z.unknown())])
  .nullable()
  .optional();

const orderStatusSchema = z.enum([
  'pending',
  'accepted',
  'confirmed',
  'preparing',
  'ready_for_dispatch',
  'shipped',
  'out_for_delivery',
  'delivered',
  'completed',
  'cancelled',
]);

const createBody = z
  .object({
    sellerId: uuidSchema.optional(),
    sellerSlug: z.string().trim().max(80).optional(),
    fromCart: z.boolean().optional(),
    items: z
      .array(
        z.object({
          productId: uuidSchema,
          variantId: uuidSchema.nullable().optional(),
          quantity: z.number().int().min(1).max(99),
        }),
      )
      .max(50)
      .optional(),
    buyerName: z.string().trim().min(2).max(120),
    buyerPhone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s()]{6,20}$/, 'Enter a valid phone number'),
    deliveryAddress: addressSchema,
    deliveryType: z
      .enum(['courier', 'self_delivery', 'self_pickup'])
      .optional(),
    payMethod: z.enum(['cod', 'upi', 'online']).optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  })
  .refine(
    value => Boolean(value.fromCart) || Boolean(value.items?.length),
    'Provide fromCart or items',
  );

ordersRouter.post('/', validate({ body: createBody }), async (req, res) => {
  res.status(201).json({
    order: await orders.createOrder(req.actor!, req.valid.body),
  });
});

const listQuery = paginationSchema.extend({
  status: orderStatusSchema.optional(),
  search: z.string().trim().max(100).optional(),
  sellerId: uuidSchema.optional(),
});

ordersRouter.get('/', validate({ query: listQuery }), async (req, res) => {
  if (req.actor?.role === 'buyer') {
    res.json(
      await orders.listBuyerOrders(req.actor, {
        page: req.valid.query.page,
        pageSize: req.valid.query.pageSize,
      }),
    );
  } else {
    res.json(
      await orders.listSellerOrders(req.actor!, {
        page: req.valid.query.page,
        pageSize: req.valid.query.pageSize,
        status: req.valid.query.status,
        search: req.valid.query.search,
        sellerId: req.valid.query.sellerId,
      }),
    );
  }
});

ordersRouter.get('/track/:token', async (req, res) => {
  res.json({
    order: await orders.getOrderByTrackingToken(String(req.params.token)),
  });
});

ordersRouter.get(
  '/seller',
  validate({ query: listQuery }),
  async (req, res) => {
    res.json(
      await orders.listSellerOrders(req.actor!, {
        page: req.valid.query.page,
        pageSize: req.valid.query.pageSize,
        status: req.valid.query.status,
        search: req.valid.query.search,
        sellerId: req.valid.query.sellerId,
      }),
    );
  },
);

ordersRouter.get(
  '/buyer',
  validate({ query: paginationSchema }),
  async (req, res) => {
    res.json(
      await orders.listBuyerOrders(req.actor!, {
        page: req.valid.query.page,
        pageSize: req.valid.query.pageSize,
      }),
    );
  },
);

ordersRouter.get(
  '/:id',
  validate({ params: z.object({ id: uuidSchema }) }),
  async (req, res) => {
    res.json({ order: await orders.getOrder(req.actor!, req.valid.params.id) });
  },
);

ordersRouter.get(
  '/:id/events',
  validate({ params: z.object({ id: uuidSchema }) }),
  async (req, res) => {
    res.json({
      events: await orders.getOrderEvents(req.actor!, req.valid.params.id),
    });
  },
);

ordersRouter.post(
  '/:id/payment-proof/presign',
  validate({
    params: z.object({ id: uuidSchema }),
    body: z.object({
      filename: z.string().trim().min(1).max(200),
      contentType: z
        .string()
        .trim()
        .regex(/^(image\/[a-z0-9.+-]+|application\/pdf)$/i),
    }),
  }),
  async (req, res) => {
    res
      .status(201)
      .json(
        await orders.presignPaymentProof(
          req.actor!,
          req.valid.params.id,
          req.valid.body.filename,
          req.valid.body.contentType,
        ),
      );
  },
);

ordersRouter.patch(
  '/:id/status',
  validate({
    params: z.object({ id: uuidSchema }),
    body: z.object({
      status: orderStatusSchema,
      note: z.string().trim().max(1000).optional(),
      trackingInfo: z
        .object({
          tracking_provider: z.string().optional(),
          trackingProvider: z.string().optional(),
          tracking_number: z.string().optional(),
          trackingNumber: z.string().optional(),
          delivery_person_name: z.string().optional(),
          deliveryPersonName: z.string().optional(),
          delivery_person_phone: z.string().optional(),
          deliveryPersonPhone: z.string().optional(),
          del_type: z
            .enum(['courier', 'self_delivery', 'self_pickup'])
            .optional(),
          deliveryType: z
            .enum(['courier', 'self_delivery', 'self_pickup'])
            .optional(),
        })
        .optional(),
      paymentInfo: z
        .object({
          pay_status: z
            .enum([
              'pending',
              'proof_submitted',
              'verified',
              'rejected',
              'paid',
              'refunded',
            ])
            .optional(),
          payStatus: z
            .enum([
              'pending',
              'proof_submitted',
              'verified',
              'rejected',
              'paid',
              'refunded',
            ])
            .optional(),
          gateway_payment_id: z.string().optional(),
          gatewayPaymentId: z.string().optional(),
        })
        .optional(),
    }),
  }),
  async (req, res) => {
    const ti = req.valid.body.trackingInfo;
    const pi = req.valid.body.paymentInfo;
    const extra =
      ti || pi
        ? {
            trackingProvider: ti?.trackingProvider ?? ti?.tracking_provider,
            trackingNumber: ti?.trackingNumber ?? ti?.tracking_number,
            deliveryPersonName:
              ti?.deliveryPersonName ?? ti?.delivery_person_name,
            deliveryPersonPhone:
              ti?.deliveryPersonPhone ?? ti?.delivery_person_phone,
            deliveryType: ti?.deliveryType ?? ti?.del_type,
            payStatus: pi?.payStatus ?? pi?.pay_status,
            gatewayPaymentId: pi?.gatewayPaymentId ?? pi?.gateway_payment_id,
          }
        : undefined;

    res.json({
      order: await orders.updateOrderStatus(
        req.actor!,
        req.valid.params.id,
        req.valid.body.status,
        req.valid.body.note,
        extra,
      ),
    });
  },
);

ordersRouter.post(
  '/:id/payment-proof',
  validate({
    params: z.object({ id: uuidSchema }),
    body: z.object({ key: z.string().min(1).max(500) }),
  }),
  async (req, res) => {
    res.json({
      order: await orders.submitPaymentProof(
        req.actor!,
        req.valid.params.id,
        req.valid.body.key,
      ),
    });
  },
);

ordersRouter.post(
  '/:id/verify-payment',
  validate({
    params: z.object({ id: uuidSchema }),
    body: z.object({ approve: z.boolean() }),
  }),
  async (req, res) => {
    res.json({
      order: await orders.verifyPayment(
        req.actor!,
        req.valid.params.id,
        req.valid.body.approve,
      ),
    });
  },
);

ordersRouter.post(
  '/:id/cancel',
  validate({
    params: z.object({ id: uuidSchema }),
    body: z
      .object({ reason: z.string().trim().max(500).optional() })
      .default({}),
  }),
  async (req, res) => {
    res.json({
      order: await orders.cancelOrder(
        req.actor!,
        req.valid.params.id,
        req.valid.body.reason,
      ),
    });
  },
);
