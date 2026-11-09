import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { conflict, forbidden, notFound } from '../lib/http-error';
import { RESERVED_SLUGS, slugify } from '../lib/slug';
import { randomToken } from '../lib/tokens';
import type { Actor } from '../auth/actor';
import { productDto, sellerDto, stableStorageReference } from '../lib/dto';

export interface SellerInput {
  fullName?: string | null;
  storeName?: string | null;
  storeSlug?: string | null;
  storeDescription?: string | null;
  storeNumber?: string | null;
  location?: string | null;
  phone?: string | null;
  contactNumber?: string | null;
  mapsUrl?: string | null;
  bannerUrl?: string | null;
  themeColor?: string;
  gstin?: string | null;
  registeredBusinessName?: string | null;
  sellerUpiId?: string | null;
  preferredPaymentMethod?: 'upi' | 'razorpay' | 'both';
  verificationDocuments?: string[];
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const cleaned = slugify(base) || `store-${randomToken(3).toLowerCase()}`;
  let candidate = RESERVED_SLUGS.has(cleaned) ? `${cleaned}-store` : cleaned;

  for (let attempt = 2; attempt < 100; attempt += 1) {
    const existing = await prisma.seller.findUnique({
      where: { storeSlug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${cleaned}-${attempt}`;
  }

  throw conflict('Could not allocate a unique store slug');
}

export async function getMySeller(actor: Actor) {
  if (actor.role !== 'seller' && actor.role !== 'admin') {
    throw forbidden('Only sellers have a store profile');
  }

  const seller = await prisma.seller.findUnique({
    where: { userId: actor.id },
  });
  return seller
    ? sellerDto(seller, { includeVerificationDocuments: true })
    : null;
}

export async function saveMySeller(actor: Actor, input: SellerInput) {
  if (actor.role !== 'seller') {
    throw forbidden('Only sellers can manage a store');
  }

  const existing = await prisma.seller.findUnique({
    where: { userId: actor.id },
  });

  let storeSlug = existing?.storeSlug ?? null;

  if (input.storeSlug !== undefined) {
    if (input.storeSlug === null || input.storeSlug.trim() === '') {
      storeSlug = null;
    } else {
      const requested = slugify(input.storeSlug);
      if (!requested) throw conflict('Store slug is invalid');
      storeSlug = await uniqueSlug(requested, existing?.id);
    }
  } else if (!storeSlug && input.storeName) {
    storeSlug = await uniqueSlug(input.storeName, existing?.id);
  }

  const verificationDocuments = input.verificationDocuments?.map(document => {
    const stableReference = stableStorageReference(
      document,
      existing?.id ?? '',
    );
    if (
      !stableReference ||
      !stableReference.startsWith(`sellers/${existing?.id ?? ''}/`)
    ) {
      throw forbidden('Verification document must be uploaded to your store');
    }
    return stableReference;
  });

  const data: Prisma.SellerUncheckedCreateInput = {
    userId: actor.id,
    fullName: input.fullName ?? existing?.fullName ?? null,
    storeName: input.storeName ?? existing?.storeName ?? null,
    storeSlug,
    storeDescription:
      input.storeDescription ?? existing?.storeDescription ?? null,
    storeNumber: input.storeNumber ?? existing?.storeNumber ?? null,
    location: input.location ?? existing?.location ?? null,
    phone: input.phone ?? existing?.phone ?? null,
    contactNumber: input.contactNumber ?? existing?.contactNumber ?? null,
    mapsUrl: input.mapsUrl ?? existing?.mapsUrl ?? null,
    bannerUrl:
      input.bannerUrl === undefined
        ? (existing?.bannerUrl ?? null)
        : stableStorageReference(input.bannerUrl, existing?.id ?? ''),
    themeColor: input.themeColor ?? existing?.themeColor ?? '#8B5CF6',
    gstin: input.gstin ?? existing?.gstin ?? null,
    registeredBusinessName:
      input.registeredBusinessName ?? existing?.registeredBusinessName ?? null,
    sellerUpiId: input.sellerUpiId ?? existing?.sellerUpiId ?? null,
    preferredPaymentMethod:
      input.preferredPaymentMethod ??
      existing?.preferredPaymentMethod ??
      'both',
    verificationDocuments:
      verificationDocuments ?? existing?.verificationDocuments ?? [],
  };

  const seller = await prisma.seller.upsert({
    where: { userId: actor.id },
    create: data,
    update: {
      fullName: data.fullName,
      storeName: data.storeName,
      storeSlug: data.storeSlug,
      storeDescription: data.storeDescription,
      storeNumber: data.storeNumber,
      location: data.location,
      phone: data.phone,
      contactNumber: data.contactNumber,
      mapsUrl: data.mapsUrl,
      bannerUrl: data.bannerUrl,
      themeColor: data.themeColor,
      gstin: data.gstin,
      registeredBusinessName: data.registeredBusinessName,
      sellerUpiId: data.sellerUpiId,
      preferredPaymentMethod: data.preferredPaymentMethod,
      verificationDocuments: data.verificationDocuments,
    },
  });

  return sellerDto(seller, { includeVerificationDocuments: true });
}

export async function submitMySeller(actor: Actor) {
  if (actor.role !== 'seller') {
    throw forbidden('Only sellers can submit a store for verification');
  }

  const seller = await prisma.seller.findUnique({
    where: { userId: actor.id },
  });
  if (!seller) throw notFound('Create your store before submitting it');
  if (!seller.storeName) {
    throw conflict('Add a store name before submitting for verification');
  }

  if (seller.verificationStatus === 'approved') {
    return sellerDto(seller, { includeVerificationDocuments: true });
  }

  const updated = await prisma.seller.update({
    where: { id: seller.id },
    data: {
      verificationStatus: 'pending',
      lastSubmittedAt: new Date(),
    },
  });

  return sellerDto(updated, { includeVerificationDocuments: true });
}

export async function getPublicSeller(slug: string) {
  const seller = await prisma.seller.findUnique({
    where: { storeSlug: slug },
  });

  if (!seller || seller.status === 'blocked') {
    throw notFound('Store not found');
  }

  return sellerDto(seller);
}

export async function listPublicProducts(
  slug: string,
  query: {
    page: number;
    pageSize: number;
    search?: string;
    category?: string;
  },
) {
  const seller = await prisma.seller.findUnique({
    where: { storeSlug: slug },
    select: { id: true, status: true },
  });

  if (!seller || seller.status === 'blocked') {
    throw notFound('Store not found');
  }

  const where: Prisma.ProductWhereInput = {
    sellerId: seller.id,
    status: 'active',
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { tags: { has: query.search } },
          ],
        }
      : {}),
    ...(query.category ? { category: query.category } : {}),
  };

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        variants: true,
        images: { orderBy: { position: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: await Promise.all(products.map(productDto)),
    total,
    page: query.page,
    pageSize: query.pageSize,
    seller: await getPublicSeller(slug),
  };
}

export async function listPublicSellers() {
  const sellers = await prisma.seller.findMany({
    where: {
      status: 'active',
      verificationStatus: 'approved',
      storeSlug: { not: null },
    },
    include: {
      products: {
        where: { status: 'active' },
        select: { id: true, category: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return sellers.map(s => {
    const categories = [
      ...new Set(s.products.map(p => p.category).filter(Boolean)),
    ] as string[];
    return {
      id: s.id,
      store_name: s.storeName,
      store_slug: s.storeSlug,
      store_description: s.storeDescription,
      location: s.location,
      banner_url: s.bannerUrl,
      theme_color: s.themeColor,
      contact_number: s.contactNumber,
      phone: s.phone,
      product_count: s.products.length,
      categories,
    };
  });
}

export async function listCategories(slug: string) {
  const seller = await prisma.seller.findUnique({
    where: { storeSlug: slug },
    select: { id: true },
  });
  if (!seller) throw notFound('Store not found');

  const rows = await prisma.product.findMany({
    where: { sellerId: seller.id, status: 'active', category: { not: null } },
    select: { category: true },
    distinct: ['category'],
  });

  return rows
    .map(row => row.category)
    .filter((value): value is string => Boolean(value));
}
