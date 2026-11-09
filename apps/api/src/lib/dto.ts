import type { Prisma } from '@prisma/client';
import { storage } from '../storage';

type SellerRecord = Prisma.SellerGetPayload<Record<string, never>>;

type ProductRecord = Prisma.ProductGetPayload<{
  include: { variants: true; images: true };
}>;

type OrderRecord = Prisma.OrderGetPayload<{
  include: {
    items: { include: { product: true } };
    seller: true;
    buyer: true;
    events: true;
  };
}>;

export const num = (
  value: Prisma.Decimal | number | null | undefined,
): number => (value == null ? 0 : Number(value));

export const iso = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

export function sellerDto(seller: SellerRecord) {
  return {
    id: seller.id,
    user_id: seller.userId,
    onboarded_by_id: seller.onboardedById,
    full_name: seller.fullName,
    store_name: seller.storeName,
    store_slug: seller.storeSlug,
    store_description: seller.storeDescription,
    store_number: seller.storeNumber,
    location: seller.location,
    phone: seller.phone,
    contact_number: seller.contactNumber,
    maps_url: seller.mapsUrl,
    banner_url: seller.bannerUrl,
    theme_color: seller.themeColor,
    gstin: seller.gstin,
    registered_business_name: seller.registeredBusinessName,
    seller_upi_id: seller.sellerUpiId,
    preferred_payment_method: seller.preferredPaymentMethod,
    verification_status: seller.verificationStatus,
    verification_documents: seller.verificationDocuments,
    admin_feedback: seller.adminFeedback,
    status: seller.status,
    ai_daily_limit: seller.aiDailyLimit,
    last_submitted_at: iso(seller.lastSubmittedAt),
    created_at: seller.createdAt.toISOString(),
    updated_at: seller.updatedAt.toISOString(),
  };
}

export function variantDto(variant: ProductRecord['variants'][number]) {
  return {
    id: variant.id,
    product_id: variant.productId,
    size: variant.size,
    stock: variant.stock,
    price_override:
      variant.priceOverride == null ? null : num(variant.priceOverride),
    sku: variant.sku,
  };
}

export function productDto(product: ProductRecord) {
  const variants = [...product.variants].sort((a, b) =>
    a.size.localeCompare(b.size, undefined, { numeric: true }),
  );

  return {
    id: product.id,
    seller_id: product.sellerId,
    title: product.title,
    description: product.description,
    price: num(product.price),
    discount_percent: num(product.discountPercent),
    category: product.category,
    tags: product.tags,
    image_url: product.imageUrl ?? product.images[0]?.url ?? null,
    stock: product.stock,
    low_stock_threshold: product.lowStockThreshold,
    status: product.status,
    size: variants[0]?.size ?? null,
    size_variants: variants.map(v => ({
      id: v.id,
      size: v.size,
      stock: v.stock,
      price_override: v.priceOverride == null ? null : num(v.priceOverride),
    })),
    images: product.images.map(image => ({
      id: image.id,
      url: image.url,
      storage_key: image.storageKey,
      position: image.position,
    })),
    created_at: product.createdAt.toISOString(),
    updated_at: product.updatedAt.toISOString(),
  };
}

export function orderItemDto(item: OrderRecord['items'][number]) {
  return {
    id: item.id,
    product_id: item.productId,
    variant_id: item.variantId,
    title: item.titleSnapshot,
    price: num(item.priceSnapshot),
    size: item.sizeSnapshot,
    quantity: item.quantity,
    line_total: num(item.lineTotal),
    image_url: item.product.imageUrl,
    product: {
      id: item.product.id,
      title: item.product.title,
      image_url: item.product.imageUrl,
    },
  };
}

export function orderDto(
  order: OrderRecord,
  options: { includeBuyer?: boolean; includeTrackingToken?: boolean } = {},
) {
  const items = order.items.map(orderItemDto);
  const first = items[0];
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    id: order.id,
    order_number: order.orderNumber,
    seller_id: order.sellerId,
    buyer_id: order.buyerId,
    buyer_name: order.buyerName,
    buyer_phone: order.buyerPhone,
    status: order.status,
    subtotal: num(order.subtotal),
    discount_percent: num(order.discountPercent),
    total: num(order.total),
    delivery_address: order.deliveryAddress,
    del_type: order.deliveryType,
    delivery_person_name: order.deliveryPersonName,
    delivery_person_phone: order.deliveryPersonPhone,
    pay_method: order.payMethod,
    pay_status: order.payStatus,
    payment_proof_url: order.paymentProofKey
      ? storage.publicUrl(order.paymentProofKey)
      : null,
    tracking_provider: order.trackingProvider,
    tracking_number: order.trackingNumber,
    notes: order.notes,
    confirmed_at: iso(order.confirmedAt),
    completed_at: iso(order.completedAt),
    cancelled_at: iso(order.cancelledAt),
    created_at: order.createdAt.toISOString(),
    updated_at: order.updatedAt.toISOString(),
    items,
    // Legacy single-item aliases keep the existing UI components working.
    product: first?.product ?? null,
    quantity,
    unit_price: first?.price ?? 0,
    selected_size: first?.size ?? null,
    seller: {
      id: order.seller.id,
      store_name: order.seller.storeName,
      store_slug: order.seller.storeSlug,
      phone: order.seller.phone,
      contact_number: order.seller.contactNumber,
    },
    ...(options.includeBuyer
      ? {
          buyer: order.buyer
            ? {
                id: order.buyer.id,
                name: order.buyer.name,
                email: order.buyer.email,
                phone: order.buyer.phone,
              }
            : null,
        }
      : {}),
    ...(options.includeTrackingToken
      ? { tracking_token: order.trackingToken }
      : {}),
    events: order.events.map(event => ({
      id: event.id,
      status: event.toStatus,
      previous_status: event.fromStatus,
      note: event.note,
      created_at: event.createdAt.toISOString(),
    })),
  };
}

export type SellerDto = ReturnType<typeof sellerDto>;
export type ProductDto = ReturnType<typeof productDto>;
export type OrderDto = ReturnType<typeof orderDto>;
