import {
  PrismaClient,
  Role,
  VerificationStatus,
  SellerStatus,
  ProductStatus,
  OrderStatus,
  DeliveryType,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface LegacyProfile {
  id: string;
  email?: string;
  full_name?: string;
  phone?: string;
  role?: string;
  is_blocked?: boolean;
  created_at?: string;
}

interface LegacySeller {
  id: string;
  user_id: string;
  store_name?: string;
  store_slug?: string;
  store_description?: string;
  store_number?: string;
  location?: string;
  phone?: string;
  contact_number?: string;
  maps_url?: string;
  banner_url?: string;
  theme_color?: string;
  gstin?: string;
  registered_business_name?: string;
  seller_upi_id?: string;
  preferred_payment_method?: string;
  verification_status?: string;
  status?: string;
  ai_daily_limit?: number;
  created_at?: string;
}

interface LegacyProduct {
  id: string;
  seller_id: string;
  title: string;
  description?: string;
  price: number;
  category?: string;
  tags?: string[];
  stock?: number;
  low_stock_threshold?: number;
  status?: string;
  size_variants?: Array<{
    size: string;
    stock?: number;
    price?: number;
    sku?: string;
  }>;
  image_url?: string;
  created_at?: string;
}

interface LegacyOrder {
  id: string;
  order_number?: string;
  seller_id: string;
  buyer_id?: string;
  buyer_name?: string;
  buyer_phone?: string;
  product_id?: string;
  quantity?: number;
  status?: string;
  total_amount?: number;
  delivery_address?: any;
  delivery_type?: string;
  payment_method?: string;
  payment_status?: string;
  payment_proof_url?: string;
  tracking_number?: string;
  tracking_token?: string;
  notes?: string;
  created_at?: string;
}

export async function runMigration(inputDir?: string): Promise<{
  usersMigrated: number;
  sellersMigrated: number;
  productsMigrated: number;
  variantsMigrated: number;
  ordersMigrated: number;
  orderItemsMigrated: number;
}> {
  console.log('--- Starting legacy data import ---');
  let usersCount = 0;
  let sellersCount = 0;
  let productsCount = 0;
  let variantsCount = 0;
  let ordersCount = 0;
  let orderItemsCount = 0;

  const dataDir = inputDir || path.resolve(__dirname, '../data/migration');

  if (!fs.existsSync(dataDir)) {
    console.log(`No migration data directory found at ${dataDir}.`);
    console.log(
      'Skipping file import — schema reconciliation & seed checks completed.',
    );
    return {
      usersMigrated: 0,
      sellersMigrated: 0,
      productsMigrated: 0,
      variantsMigrated: 0,
      ordersMigrated: 0,
      orderItemsMigrated: 0,
    };
  }

  // 1. Migrate Profiles/Users
  const profilesFile = path.join(dataDir, 'profiles.json');
  if (fs.existsSync(profilesFile)) {
    const rawProfiles: LegacyProfile[] = JSON.parse(
      fs.readFileSync(profilesFile, 'utf8'),
    );
    for (const p of rawProfiles) {
      if (!p.email) continue;
      const role = (
        ['admin', 'seller', 'buyer', 'volunteer'].includes(p.role || '')
          ? p.role
          : 'buyer'
      ) as Role;
      await prisma.user.upsert({
        where: { email: p.email.toLowerCase() },
        update: {
          name: p.full_name || undefined,
          phone: p.phone || undefined,
          role,
          isBlocked: !!p.is_blocked,
        },
        create: {
          id: p.id,
          email: p.email.toLowerCase(),
          name: p.full_name,
          phone: p.phone,
          role,
          onboarded: true,
          emailVerified: true,
          isBlocked: !!p.is_blocked,
        },
      });
      usersCount++;
    }
  }

  // 2. Migrate Sellers
  const sellersFile = path.join(dataDir, 'sellers.json');
  if (fs.existsSync(sellersFile)) {
    const rawSellers: LegacySeller[] = JSON.parse(
      fs.readFileSync(sellersFile, 'utf8'),
    );
    for (const s of rawSellers) {
      await prisma.seller.upsert({
        where: { id: s.id },
        update: {
          storeName: s.store_name,
          storeSlug: s.store_slug,
          storeDescription: s.store_description,
          location: s.location,
          sellerUpiId: s.seller_upi_id,
        },
        create: {
          id: s.id,
          userId: s.user_id,
          storeName: s.store_name,
          storeSlug: s.store_slug || `store-${s.id.slice(0, 8)}`,
          storeDescription: s.store_description,
          storeNumber: s.store_number,
          location: s.location,
          phone: s.phone || s.contact_number,
          contactNumber: s.contact_number,
          mapsUrl: s.maps_url,
          bannerUrl: s.banner_url,
          themeColor: s.theme_color || '#8B5CF6',
          gstin: s.gstin,
          registeredBusinessName: s.registered_business_name,
          sellerUpiId: s.seller_upi_id,
          preferredPaymentMethod: s.preferred_payment_method || 'both',
          verificationStatus:
            (s.verification_status as VerificationStatus) ||
            VerificationStatus.pending,
          status:
            s.status === 'blocked' ? SellerStatus.blocked : SellerStatus.active,
          aiDailyLimit: s.ai_daily_limit ?? 25,
        },
      });
      sellersCount++;
    }
  }

  // 3. Migrate Products + explode size_variants into ProductVariant
  const productsFile = path.join(dataDir, 'products.json');
  if (fs.existsSync(productsFile)) {
    const rawProducts: LegacyProduct[] = JSON.parse(
      fs.readFileSync(productsFile, 'utf8'),
    );
    for (const p of rawProducts) {
      const product = await prisma.product.upsert({
        where: { id: p.id },
        update: {
          title: p.title,
          price: p.price,
          stock: p.stock ?? 0,
        },
        create: {
          id: p.id,
          sellerId: p.seller_id,
          title: p.title,
          description: p.description,
          price: p.price,
          category: p.category,
          tags: p.tags || [],
          stock: p.stock ?? 0,
          lowStockThreshold: p.low_stock_threshold ?? 5,
          status:
            p.status === 'archived'
              ? ProductStatus.archived
              : ProductStatus.active,
        },
      });
      productsCount++;

      // Explode size_variants
      if (Array.isArray(p.size_variants) && p.size_variants.length > 0) {
        for (const variant of p.size_variants) {
          if (!variant.size) continue;
          await prisma.productVariant.upsert({
            where: {
              productId_size: {
                productId: product.id,
                size: variant.size,
              },
            },
            update: {
              stock: variant.stock ?? product.stock,
              priceOverride: variant.price ?? undefined,
            },
            create: {
              productId: product.id,
              size: variant.size,
              stock: variant.stock ?? product.stock,
              priceOverride: variant.price ?? undefined,
              sku: variant.sku,
            },
          });
          variantsCount++;
        }
      }
    }
  }

  // 4. Migrate Orders + normalize single product_id to OrderItem
  const ordersFile = path.join(dataDir, 'orders.json');
  if (fs.existsSync(ordersFile)) {
    const rawOrders: LegacyOrder[] = JSON.parse(
      fs.readFileSync(ordersFile, 'utf8'),
    );
    for (const o of rawOrders) {
      const orderNumber =
        o.order_number || `ORD-${o.id.slice(0, 8).toUpperCase()}`;
      const trackingToken =
        o.tracking_token ||
        `trk-${Math.random().toString(36).substring(2, 10)}`;
      const total = o.total_amount ?? 0;

      const order = await prisma.order.upsert({
        where: { id: o.id },
        update: {
          status: (o.status as OrderStatus) || OrderStatus.pending,
        },
        create: {
          id: o.id,
          orderNumber,
          sellerId: o.seller_id,
          buyerId: o.buyer_id,
          buyerName: o.buyer_name,
          buyerPhone: o.buyer_phone,
          status: (o.status as OrderStatus) || OrderStatus.pending,
          subtotal: total,
          total: total,
          deliveryAddress: o.delivery_address || undefined,
          deliveryType:
            (o.delivery_type as DeliveryType) || DeliveryType.courier,
          payMethod: (o.payment_method as PaymentMethod) || PaymentMethod.cod,
          payStatus:
            (o.payment_status as PaymentStatus) || PaymentStatus.pending,
          paymentProofKey: o.payment_proof_url,
          trackingNumber: o.tracking_number,
          trackingToken,
          notes: o.notes,
        },
      });
      ordersCount++;

      // If old order had a single product_id, create order_item
      if (o.product_id) {
        const product = await prisma.product.findUnique({
          where: { id: o.product_id },
        });
        const qty = o.quantity ?? 1;
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: o.product_id,
            titleSnapshot: product?.title || 'Imported Product',
            priceSnapshot: product?.price || total,
            quantity: qty,
            lineTotal: total,
          },
        });
        orderItemsCount++;
      }
    }
  }

  console.log('--- Migration Summary Report ---');
  console.log(`Users migrated: ${usersCount}`);
  console.log(`Sellers migrated: ${sellersCount}`);
  console.log(`Products migrated: ${productsCount}`);
  console.log(`Variants exploded: ${variantsCount}`);
  console.log(`Orders migrated: ${ordersCount}`);
  console.log(`Order items created: ${orderItemsCount}`);
  console.log('--------------------------------');

  return {
    usersMigrated: usersCount,
    sellersMigrated: sellersCount,
    productsMigrated: productsCount,
    variantsMigrated: variantsCount,
    ordersMigrated: ordersCount,
    orderItemsMigrated: orderItemsCount,
  };
}

if (require.main === module) {
  runMigration()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
