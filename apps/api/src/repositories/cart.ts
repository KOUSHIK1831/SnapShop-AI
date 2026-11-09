import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { badRequest, forbidden, notFound } from '../lib/http-error';
import type { Actor } from '../auth/actor';
import { effectivePrice, roundMoney } from '../lib/pricing';
import { productDto } from '../lib/dto';

const cartInclude = {
  items: {
    include: {
      variant: true,
      cart: false,
      product: {
        include: {
          variants: true,
          images: { orderBy: { position: 'asc' } },
        },
      },
    },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.CartInclude;

type CartRecord = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

export async function cartDto(cart: CartRecord) {
  const items = await Promise.all(
    cart.items.map(async item => {
      const base = Number(item.variant?.priceOverride ?? item.product.price);
      const unit = effectivePrice(base, Number(item.product.discountPercent));
      const lineTotal = roundMoney(unit * item.quantity);

      return {
        id: item.id,
        product_id: item.productId,
        variant_id: item.variantId,
        size: item.variant?.size ?? null,
        quantity: item.quantity,
        unit_price: unit,
        line_total: lineTotal,
        product: await productDto(item.product),
      };
    }),
  );

  return {
    id: cart.id,
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: roundMoney(items.reduce((sum, item) => sum + item.line_total, 0)),
  };
}

async function ensureCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: cartInclude,
  });
}

function requireBuyer(actor: Actor) {
  if (actor.role !== 'buyer') {
    throw forbidden('Only buyers have a cart');
  }
}

export async function getCart(actor: Actor) {
  requireBuyer(actor);
  return cartDto(await ensureCart(actor.id));
}

export async function addCartItem(
  actor: Actor,
  input: { productId: string; variantId?: string | null; quantity: number },
) {
  requireBuyer(actor);

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    include: { variants: true },
  });

  if (!product || product.status !== 'active') {
    throw notFound('Product is not available');
  }

  const variant = input.variantId
    ? product.variants.find(item => item.id === input.variantId)
    : undefined;

  if (input.variantId && !variant) {
    throw notFound('Product variant not found');
  }

  if (product.variants.length > 0 && !variant) {
    throw badRequest('Select a size for this product');
  }

  const available = variant ? variant.stock : product.stock;
  if (available < input.quantity) {
    throw badRequest('Not enough stock available');
  }

  const cart = await ensureCart(actor.id);

  const existing = cart.items.find(
    item =>
      item.productId === product.id &&
      (item.variantId ?? null) === (variant?.id ?? null),
  );

  if (existing) {
    if (available < existing.quantity + input.quantity) {
      throw badRequest('Not enough stock available');
    }
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + input.quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        variantId: variant?.id ?? null,
        quantity: input.quantity,
      },
    });
  }

  return getCart(actor);
}

export async function updateCartItem(
  actor: Actor,
  itemId: string,
  quantity: number,
) {
  requireBuyer(actor);

  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: {
      cart: true,
      variant: true,
      product: true,
    },
  });

  if (!item || item.cart.userId !== actor.id) {
    throw notFound('Cart item not found');
  }

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return getCart(actor);
  }

  const available = item.variant ? item.variant.stock : item.product.stock;
  if (available < quantity) {
    throw badRequest('Not enough stock available');
  }

  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity },
  });

  return getCart(actor);
}

export async function removeCartItem(actor: Actor, itemId: string) {
  requireBuyer(actor);

  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true },
  });

  if (!item || item.cart.userId !== actor.id) {
    throw notFound('Cart item not found');
  }

  await prisma.cartItem.delete({ where: { id: item.id } });
  return getCart(actor);
}

export async function clearCart(actor: Actor) {
  requireBuyer(actor);
  await prisma.cartItem.deleteMany({
    where: { cart: { userId: actor.id } },
  });
  return getCart(actor);
}
