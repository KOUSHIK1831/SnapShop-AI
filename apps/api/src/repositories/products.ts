import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { conflict, forbidden, notFound } from '../lib/http-error';
import type { Actor } from '../auth/actor';
import { productDto } from '../lib/dto';

export interface VariantInput {
  size: string;
  stock?: number;
  priceOverride?: number | null;
  sku?: string | null;
}

export interface ProductInput {
  title: string;
  description?: string | null;
  price: number;
  discountPercent?: number;
  category?: string | null;
  tags?: string[];
  imageUrl?: string | null;
  stock?: number;
  lowStockThreshold?: number;
  status?: 'draft' | 'active' | 'archived';
  variants?: VariantInput[];
}

export type ProductUpdateInput = Partial<ProductInput>;

const productInclude = {
  variants: true,
  images: { orderBy: { position: 'asc' } },
} satisfies Prisma.ProductInclude;

async function sellerFor(actor: Actor) {
  if (actor.role !== 'seller') {
    throw forbidden('Only sellers can manage products');
  }
  const seller = await prisma.seller.findUnique({
    where: { userId: actor.id },
  });
  if (!seller) throw notFound('Create your store before adding products');
  return seller;
}

async function ownedProduct(actor: Actor, productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: productInclude,
  });
  if (!product) throw notFound('Product not found');

  if (actor.role !== 'admin') {
    const seller = await sellerFor(actor);
    if (product.sellerId !== seller.id) throw forbidden();
  }

  return product;
}

export async function listOwnedProducts(
  actor: Actor,
  query: {
    page: number;
    pageSize: number;
    search?: string;
    status?: 'draft' | 'active' | 'archived';
    sellerId?: string;
    lowStock?: boolean;
  },
) {
  if (actor.role !== 'seller' && actor.role !== 'admin') {
    throw forbidden('Only sellers can list products');
  }

  let sellerId: string | undefined;

  if (actor.role === 'seller') {
    const seller = await sellerFor(actor);
    sellerId = seller.id;
  } else if (query.sellerId) {
    sellerId = query.sellerId;
  }

  const where: Prisma.ProductWhereInput = {
    ...(sellerId ? { sellerId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { category: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  const items = products.map(productDto);
  return {
    items: query.lowStock
      ? items.filter(product => product.stock <= product.low_stock_threshold)
      : items,
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getOwnedProduct(actor: Actor, productId: string) {
  return productDto(await ownedProduct(actor, productId));
}

function variantCreateData(variants: VariantInput[]) {
  return variants.map(variant => ({
    size: variant.size.trim(),
    stock: variant.stock ?? 0,
    priceOverride: variant.priceOverride ?? null,
    sku: variant.sku ?? null,
  }));
}

export async function createProduct(actor: Actor, input: ProductInput) {
  const seller = await sellerFor(actor);

  const variants = input.variants ?? [];
  const duplicate = new Set<string>();
  for (const variant of variants) {
    if (duplicate.has(variant.size.trim())) {
      throw conflict(`Duplicate size "${variant.size}"`);
    }
    duplicate.add(variant.size.trim());
  }

  const stock =
    variants.length > 0
      ? variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0)
      : (input.stock ?? 0);

  const product = await prisma.product.create({
    data: {
      sellerId: seller.id,
      title: input.title.trim(),
      description: input.description ?? null,
      price: input.price,
      discountPercent: input.discountPercent ?? 0,
      category: input.category ?? null,
      tags: input.tags ?? [],
      imageUrl: input.imageUrl ?? null,
      stock,
      lowStockThreshold: input.lowStockThreshold ?? 5,
      status: input.status ?? 'active',
      ...(variants.length > 0
        ? { variants: { create: variantCreateData(variants) } }
        : {}),
    },
    include: productInclude,
  });

  return productDto(product);
}

export async function updateProduct(
  actor: Actor,
  productId: string,
  input: ProductUpdateInput,
) {
  const existing = await ownedProduct(actor, productId);

  const variants = input.variants;
  if (variants) {
    const duplicate = new Set<string>();
    for (const variant of variants) {
      if (duplicate.has(variant.size.trim())) {
        throw conflict(`Duplicate size "${variant.size}"`);
      }
      duplicate.add(variant.size.trim());
    }
  }

  const stock = variants
    ? variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0)
    : input.stock;

  const product = await prisma.product.update({
    where: { id: existing.id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.price !== undefined ? { price: input.price } : {}),
      ...(input.discountPercent !== undefined
        ? { discountPercent: input.discountPercent }
        : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.lowStockThreshold !== undefined
        ? { lowStockThreshold: input.lowStockThreshold }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(stock !== undefined ? { stock } : {}),
      ...(variants
        ? {
            variants: {
              deleteMany: {},
              create: variantCreateData(variants),
            },
          }
        : {}),
    },
    include: productInclude,
  });

  return productDto(product);
}

export async function archiveProduct(actor: Actor, productId: string) {
  const existing = await ownedProduct(actor, productId);
  const product = await prisma.product.update({
    where: { id: existing.id },
    data: { status: 'archived' },
    include: productInclude,
  });
  return productDto(product);
}

export async function bulkUpdateStock(
  actor: Actor,
  items: Array<{
    id: string;
    stock?: number;
    variants?: Array<{ size: string; stock: number }>;
  }>,
) {
  const seller = await sellerFor(actor);
  const owned = await prisma.product.findMany({
    where: { sellerId: seller.id, id: { in: items.map(item => item.id) } },
    include: { variants: true },
  });
  const byId = new Map(owned.map(product => [product.id, product]));

  await prisma.$transaction(
    items.flatMap(item => {
      const product = byId.get(item.id);
      if (!product) return [];

      const operations: Prisma.PrismaPromise<unknown>[] = [];

      if (item.variants?.length) {
        for (const variantInput of item.variants) {
          const variant = product.variants.find(
            v => v.size === variantInput.size,
          );
          if (variant) {
            operations.push(
              prisma.productVariant.update({
                where: { id: variant.id },
                data: { stock: variantInput.stock },
              }),
            );
          }
        }

        const nextStocks = new Map(
          product.variants.map(variant => [
            variant.size,
            item.variants?.find(v => v.size === variant.size)?.stock ??
              variant.stock,
          ]),
        );
        const total = [...nextStocks.values()].reduce(
          (sum, value) => sum + value,
          0,
        );
        operations.push(
          prisma.product.update({
            where: { id: product.id },
            data: { stock: total },
          }),
        );
      } else if (item.stock !== undefined) {
        operations.push(
          prisma.product.update({
            where: { id: product.id },
            data: { stock: item.stock },
          }),
        );
      }

      return operations;
    }),
  );

  const refreshed = await prisma.product.findMany({
    where: { id: { in: items.map(item => item.id) } },
    include: productInclude,
  });

  return refreshed.map(productDto);
}

async function recomputeProductStock(productId: string) {
  const variants = await prisma.productVariant.findMany({
    where: { productId },
    select: { stock: true },
  });
  if (variants.length === 0) return;

  await prisma.product.update({
    where: { id: productId },
    data: { stock: variants.reduce((sum, variant) => sum + variant.stock, 0) },
  });
}

export async function addVariant(
  actor: Actor,
  productId: string,
  input: VariantInput,
) {
  const product = await ownedProduct(actor, productId);
  const size = input.size.trim();

  if (product.variants.some(variant => variant.size === size)) {
    throw conflict(`Size "${size}" already exists`);
  }

  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      size,
      stock: input.stock ?? 0,
      priceOverride: input.priceOverride ?? null,
      sku: input.sku ?? null,
    },
  });

  await recomputeProductStock(product.id);
  return productDto(await ownedProduct(actor, product.id));
}

export async function updateVariant(
  actor: Actor,
  productId: string,
  variantId: string,
  input: Partial<VariantInput>,
) {
  const product = await ownedProduct(actor, productId);
  const variant = product.variants.find(item => item.id === variantId);
  if (!variant) throw notFound('Variant not found');

  if (input.size && input.size !== variant.size) {
    if (product.variants.some(item => item.size === input.size)) {
      throw conflict(`Size "${input.size}" already exists`);
    }
  }

  await prisma.productVariant.update({
    where: { id: variant.id },
    data: {
      ...(input.size !== undefined ? { size: input.size.trim() } : {}),
      ...(input.stock !== undefined ? { stock: input.stock } : {}),
      ...(input.priceOverride !== undefined
        ? { priceOverride: input.priceOverride }
        : {}),
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
    },
  });

  await recomputeProductStock(product.id);
  return productDto(await ownedProduct(actor, product.id));
}

export async function deleteVariant(
  actor: Actor,
  productId: string,
  variantId: string,
) {
  const product = await ownedProduct(actor, productId);
  if (!product.variants.some(item => item.id === variantId)) {
    throw notFound('Variant not found');
  }

  await prisma.productVariant.delete({ where: { id: variantId } });
  await recomputeProductStock(product.id);
  return productDto(await ownedProduct(actor, product.id));
}

export async function addImage(
  actor: Actor,
  productId: string,
  input: { storageKey: string; url: string; position?: number },
) {
  const product = await ownedProduct(actor, productId);
  const count = product.images.length;

  await prisma.productImage.create({
    data: {
      productId: product.id,
      storageKey: input.storageKey,
      url: input.url,
      position: input.position ?? count,
    },
  });

  if (!product.imageUrl) {
    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl: input.url },
    });
  }

  return productDto(await ownedProduct(actor, product.id));
}

export async function deleteImage(
  actor: Actor,
  productId: string,
  imageId: string,
) {
  const product = await ownedProduct(actor, productId);
  const image = product.images.find(item => item.id === imageId);
  if (!image) throw notFound('Image not found');

  await prisma.productImage.delete({ where: { id: image.id } });

  if (product.imageUrl === image.url) {
    const next = product.images.find(item => item.id !== imageId);
    await prisma.product.update({
      where: { id: product.id },
      data: { imageUrl: next?.url ?? null },
    });
  }

  return productDto(await ownedProduct(actor, product.id));
}
