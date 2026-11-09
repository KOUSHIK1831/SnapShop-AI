import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, conflict, forbidden, notFound } from '../lib/http-error';
import type { Actor } from '../auth/actor';
import { effectivePrice, roundMoney } from '../lib/pricing';
import { orderDto } from '../lib/dto';
import { randomToken } from '../lib/tokens';
import { emitToSeller, emitToUser } from '../realtime';
import {
  sendNewOrderEmail,
  sendOrderStatusEmail,
  trackingLink,
} from '../services/mailer';
import { logger } from '../lib/logger';

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready_for_dispatch', 'cancelled'],
  ready_for_dispatch: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export interface OrderItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export interface CreateOrderInput {
  sellerId?: string;
  sellerSlug?: string;
  fromCart?: boolean;
  items?: OrderItemInput[];
  buyerName: string;
  buyerPhone: string;
  deliveryAddress?: Prisma.InputJsonValue | null;
  deliveryType?: 'courier' | 'self_delivery' | 'self_pickup';
  payMethod?: 'cod' | 'upi' | 'online';
  notes?: string | null;
}

const orderInclude = {
  items: { include: { product: true } },
  seller: true,
  buyer: true,
  events: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.OrderInclude;

type OrderRecord = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function newOrderNumber(): string {
  const date = new Date();
  const stamp = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('');
  const suffix = randomToken(4)
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase();
  return `SS-${stamp}-${suffix}`;
}

async function sendOrderEmails(order: OrderRecord) {
  try {
    if (order.buyer?.email) {
      void sendOrderStatusEmail({
        to: order.buyer.email,
        buyerName: order.buyerName,
        orderNumber: order.orderNumber,
        status: order.status,
        trackUrl: trackingLink(order.trackingToken),
      });
    }
  } catch (error) {
    logger.warn({ err: error, orderId: order.id }, 'Buyer email failed');
  }
}

export async function createOrder(actor: Actor, input: CreateOrderInput) {
  if (actor.role !== 'buyer') {
    throw forbidden('Only buyers can place orders');
  }

  const created = await prisma.$transaction(async tx => {
    let rawItems: OrderItemInput[];
    let cartId: string | undefined;

    if (input.fromCart) {
      const cart = await tx.cart.findUnique({
        where: { userId: actor.id },
        include: { items: true },
      });
      if (!cart || cart.items.length === 0) {
        throw badRequest('Your cart is empty');
      }
      cartId = cart.id;
      rawItems = cart.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      }));
    } else {
      rawItems = input.items ?? [];
      if (rawItems.length === 0) {
        throw badRequest('Add at least one product to the order');
      }
    }

    const merged = new Map<string, OrderItemInput>();
    for (const item of rawItems) {
      const key = `${item.productId}:${item.variantId ?? ''}`;
      const existing = merged.get(key);
      merged.set(key, {
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: (existing?.quantity ?? 0) + item.quantity,
      });
    }
    const items = [...merged.values()];

    const products = await tx.product.findMany({
      where: { id: { in: [...new Set(items.map(item => item.productId))] } },
      include: { variants: true },
    });
    const productById = new Map(products.map(product => [product.id, product]));

    const sellerIds = new Set(products.map(product => product.sellerId));
    if (sellerIds.size === 0) throw notFound('Products not found');
    if (sellerIds.size > 1) {
      throw badRequest('Checkout one store at a time');
    }

    const sellerId = [...sellerIds][0];
    if (input.sellerId && input.sellerId !== sellerId) {
      throw badRequest('The cart contains products from another store');
    }

    const seller = await tx.seller.findUnique({ where: { id: sellerId } });
    if (!seller || seller.status === 'blocked') {
      throw notFound('This store is not accepting orders');
    }
    if (input.sellerSlug && seller.storeSlug !== input.sellerSlug) {
      throw badRequest('The cart contains products from another store');
    }

    const orderItems: Array<{
      productId: string;
      variantId: string | null;
      titleSnapshot: string;
      priceSnapshot: number;
      sizeSnapshot: string | null;
      quantity: number;
      lineTotal: number;
    }> = [];

    for (const item of items) {
      const product = productById.get(item.productId);
      if (!product || product.status !== 'active') {
        throw notFound('A product in the order is no longer available');
      }

      const variant = item.variantId
        ? product.variants.find(candidate => candidate.id === item.variantId)
        : undefined;

      if (item.variantId && !variant) {
        throw notFound('A selected size is no longer available');
      }
      if (product.variants.length > 0 && !variant) {
        throw badRequest(`Select a size for ${product.title}`);
      }

      const available = variant ? variant.stock : product.stock;
      if (available < item.quantity) {
        throw conflict(
          `Not enough stock for ${product.title}`,
          'insufficient_stock',
        );
      }

      const basePrice = Number(variant?.priceOverride ?? product.price);
      const unitPrice = effectivePrice(
        basePrice,
        Number(product.discountPercent),
      );

      const decremented = await tx.product.updateMany({
        where: { id: product.id, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (decremented.count === 0) {
        throw conflict(
          `Not enough stock for ${product.title}`,
          'insufficient_stock',
        );
      }

      if (variant) {
        const variantDecremented = await tx.productVariant.updateMany({
          where: { id: variant.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (variantDecremented.count === 0) {
          throw conflict(
            `The selected size of ${product.title} just sold out`,
            'insufficient_stock',
          );
        }
      }

      orderItems.push({
        productId: product.id,
        variantId: variant?.id ?? null,
        titleSnapshot: product.title,
        priceSnapshot: unitPrice,
        sizeSnapshot: variant?.size ?? null,
        quantity: item.quantity,
        lineTotal: roundMoney(unitPrice * item.quantity),
      });
    }

    const subtotal = roundMoney(
      orderItems.reduce((sum, item) => sum + item.lineTotal, 0),
    );

    const payload = {
      sellerId: seller.id,
      buyerId: actor.id,
      buyerName: input.buyerName.trim(),
      buyerPhone: input.buyerPhone.trim(),
      status: 'pending' as const,
      subtotal,
      discountPercent: 0,
      total: subtotal,
      deliveryAddress: input.deliveryAddress ?? undefined,
      deliveryType: input.deliveryType ?? 'courier',
      payMethod: input.payMethod ?? 'cod',
      payStatus: 'pending' as const,
      trackingToken: randomToken(18),
      notes: input.notes ?? null,
      items: { create: orderItems },
      events: {
        create: {
          toStatus: 'pending' as const,
          actorId: actor.id,
          note: 'Order placed',
        },
      },
    };

    let order: OrderRecord | null = null;
    let lastError: unknown;

    for (let attempt = 0; attempt < 5 && !order; attempt += 1) {
      try {
        order = await tx.order.create({
          data: {
            ...payload,
            orderNumber: newOrderNumber(),
          },
          include: orderInclude,
        });
      } catch (error) {
        lastError = error;
        if (!(
          error instanceof Object &&
          'code' in error &&
          (error as { code?: string }).code === 'P2002'
        )) {
          throw error;
        }
      }
    }

    if (!order) throw lastError ?? conflict('Could not create the order');

    if (cartId) {
      await tx.cartItem.deleteMany({ where: { cartId } });
    }

    return order;
  });

  const sellerUser = await prisma.user.findUnique({
    where: { id: created.seller.userId },
    select: { email: true, name: true },
  });

  if (sellerUser?.email) {
    void sendNewOrderEmail({
      to: sellerUser.email,
      storeName: created.seller.storeName ?? 'Your store',
      orderNumber: created.orderNumber,
      total: Number(created.total).toFixed(2),
    });
  }

  emitToSeller(created.seller.userId, 'order:new', {
    orderId: created.id,
    orderNumber: created.orderNumber,
    total: Number(created.total),
    buyerName: created.buyerName,
  });

  return orderDto(created, { includeBuyer: true, includeTrackingToken: true });
}

export async function listSellerOrders(
  actor: Actor,
  query: {
    page: number;
    pageSize: number;
    status?: OrderStatus;
    search?: string;
    sellerId?: string;
  },
) {
  if (actor.role !== 'seller' && actor.role !== 'admin') {
    throw forbidden('Only sellers can list store orders');
  }

  let sellerId: string | undefined;
  if (actor.role === 'seller') {
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.id },
      select: { id: true },
    });
    if (!seller) throw notFound('Store not found');
    sellerId = seller.id;
  } else if (query.sellerId) {
    sellerId = query.sellerId;
  }

  const where: Prisma.OrderWhereInput = {
    ...(sellerId ? { sellerId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            {
              orderNumber: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            { buyerName: { contains: query.search, mode: 'insensitive' } },
            { buyerPhone: { contains: query.search } },
          ],
        }
      : {}),
  };

  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: orders.map(order =>
      orderDto(order, {
        includeBuyer: true,
        includeTrackingToken: true,
      }),
    ),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function listBuyerOrders(
  actor: Actor,
  query: { page: number; pageSize: number },
) {
  if (actor.role !== 'buyer') {
    throw forbidden('Only buyers have a buyer order history');
  }

  const where: Prisma.OrderWhereInput = { buyerId: actor.id };
  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: orders.map(order => orderDto(order)),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

async function findOrderFor(actor: Actor, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });
  if (!order) throw notFound('Order not found');

  if (actor.role === 'admin') return order;
  if (actor.role === 'seller') {
    const seller = await prisma.seller.findUnique({
      where: { userId: actor.id },
      select: { id: true },
    });
    if (seller?.id === order.sellerId) return order;
  }
  if (actor.role === 'buyer' && order.buyerId === actor.id) return order;

  throw forbidden('You do not have access to this order');
}

export async function getOrder(actor: Actor, orderId: string) {
  return orderDto(await findOrderFor(actor, orderId), {
    includeBuyer: actor.role !== 'buyer',
    includeTrackingToken: true,
  });
}

export async function getOrderByTrackingToken(token: string) {
  const order = await prisma.order.findUnique({
    where: { trackingToken: token },
    include: orderInclude,
  });
  if (!order) throw notFound('Tracking link is invalid or has expired');

  const dto = orderDto(order);
  return {
    ...dto,
    buyer_phone: dto.buyer_phone
      ? `${'*'.repeat(Math.max(0, dto.buyer_phone.length - 4))}${dto.buyer_phone.slice(-4)}`
      : null,
  };
}

export async function updateOrderStatus(
  actor: Actor,
  orderId: string,
  status: OrderStatus,
  note?: string,
  extra?: {
    trackingProvider?: string | null;
    trackingNumber?: string | null;
    deliveryPersonName?: string | null;
    deliveryPersonPhone?: string | null;
    deliveryType?: 'courier' | 'self_delivery' | 'self_pickup';
    payStatus?:
      | 'pending'
      | 'proof_submitted'
      | 'verified'
      | 'rejected'
      | 'paid'
      | 'refunded';
    gatewayPaymentId?: string | null;
  },
) {
  const order = await findOrderFor(actor, orderId);

  if (order.status === status && !extra) {
    return orderDto(order, { includeBuyer: true, includeTrackingToken: true });
  }

  if (actor.role === 'buyer') {
    if (!(order.status === 'pending' && status === 'cancelled')) {
      throw forbidden('Buyers can only cancel a pending order');
    }
  } else if (actor.role !== 'admin') {
    if (!canTransition(order.status, status)) {
      throw conflict(
        `Cannot move an order from ${order.status} to ${status}`,
        'invalid_transition',
      );
    }
  } else if (order.status === 'completed' || order.status === 'cancelled') {
    throw conflict('Terminal orders cannot be changed', 'terminal_order');
  }

  const updated = await prisma.$transaction(async tx => {
    const timestampData: Prisma.OrderUpdateInput = {
      status,
      ...(status === 'confirmed' ? { confirmedAt: new Date() } : {}),
      ...(status === 'completed' ? { completedAt: new Date() } : {}),
      ...(status === 'cancelled' ? { cancelledAt: new Date() } : {}),
      ...(extra?.trackingProvider !== undefined
        ? { trackingProvider: extra.trackingProvider }
        : {}),
      ...(extra?.trackingNumber !== undefined
        ? { trackingNumber: extra.trackingNumber }
        : {}),
      ...(extra?.deliveryPersonName !== undefined
        ? { deliveryPersonName: extra.deliveryPersonName }
        : {}),
      ...(extra?.deliveryPersonPhone !== undefined
        ? { deliveryPersonPhone: extra.deliveryPersonPhone }
        : {}),
      ...(extra?.deliveryType !== undefined
        ? {
            deliveryType:
              extra.deliveryType === 'self_delivery'
                ? 'self_pickup'
                : extra.deliveryType,
          }
        : {}),
      ...(extra?.payStatus !== undefined ? { payStatus: extra.payStatus } : {}),
    };

    if (status === 'cancelled') {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }

    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: status,
        actorId: actor.id,
        note: note ?? null,
      },
    });

    return tx.order.update({
      where: { id: order.id },
      data: timestampData,
      include: orderInclude,
    });
  });

  emitToUser(order.buyerId ?? '', 'order:status', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status,
  });
  emitToSeller(order.seller.userId, 'order:status', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status,
  });

  void sendOrderEmails(updated);

  return orderDto(updated, { includeBuyer: true, includeTrackingToken: true });
}

export async function submitPaymentProof(
  actor: Actor,
  orderId: string,
  proofKey: string,
) {
  const order = await findOrderFor(actor, orderId);

  if (actor.role !== 'buyer' || order.buyerId !== actor.id) {
    throw forbidden('Only the buyer can upload a payment proof');
  }
  if (order.payMethod === 'cod') {
    throw badRequest('This order is cash on delivery');
  }
  if (order.payStatus === 'paid' || order.payStatus === 'verified') {
    throw conflict('This order is already paid');
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { paymentProofKey: proofKey, payStatus: 'proof_submitted' },
    }),
    prisma.orderEvent.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        actorId: actor.id,
        note: 'Payment proof uploaded',
      },
    }),
  ]);

  emitToSeller(order.seller.userId, 'order:status', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    payStatus: 'proof_submitted',
  });

  return getOrder(actor, order.id);
}

export async function verifyPayment(
  actor: Actor,
  orderId: string,
  approve: boolean,
) {
  const order = await findOrderFor(actor, orderId);

  if (actor.role !== 'seller' && actor.role !== 'admin') {
    throw forbidden('Only the seller can verify a payment');
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { payStatus: approve ? 'paid' : 'rejected' },
    }),
    prisma.orderEvent.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        actorId: actor.id,
        note: approve ? 'Payment verified' : 'Payment proof rejected',
      },
    }),
  ]);

  emitToUser(order.buyerId ?? '', 'order:status', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    payStatus: approve ? 'paid' : 'rejected',
  });

  return getOrder(actor, order.id);
}

export async function cancelOrder(
  actor: Actor,
  orderId: string,
  reason?: string,
) {
  return updateOrderStatus(
    actor,
    orderId,
    'cancelled',
    reason ?? 'Order cancelled',
  );
}

export async function getOrderEvents(actor: Actor, orderId: string) {
  const order = await findOrderFor(actor, orderId);
  return prisma.orderEvent.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: 'asc' },
  });
}
