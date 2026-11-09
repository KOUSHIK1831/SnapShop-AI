import {
  PrismaClient,
  Role,
  VerificationStatus,
  SellerStatus,
  ProductStatus,
} from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding database with demo data...');

  const defaultPasswordHash = await hash('Password123!');

  // 1. Admin
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@snapshop.local')
    .trim()
    .toLowerCase();
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.admin,
      onboarded: true,
      emailVerified: true,
      isBlocked: false,
    },
    create: {
      email: adminEmail,
      name: 'Platform Admin',
      role: Role.admin,
      onboarded: true,
      emailVerified: true,
      passwordHash: defaultPasswordHash,
    },
  });
  console.log(`Admin user: ${admin.email}`);

  // 2. Demo Seller
  const sellerEmail = 'seller@snapshop.local';
  const sellerUser = await prisma.user.upsert({
    where: { email: sellerEmail },
    update: {
      role: Role.seller,
      onboarded: true,
      emailVerified: true,
      isBlocked: false,
    },
    create: {
      email: sellerEmail,
      name: 'Ramesh Sharma',
      phone: '9876543210',
      role: Role.seller,
      onboarded: true,
      emailVerified: true,
      passwordHash: defaultPasswordHash,
    },
  });

  const seller = await prisma.seller.upsert({
    where: { userId: sellerUser.id },
    update: {
      storeName: 'Sharma General Store',
      storeSlug: 'sharma-store',
      storeDescription:
        'Your friendly neighborhood grocery and essentials store',
      location: 'Hyderabad, India',
      phone: '9876543210',
      contactNumber: '9876543210',
      sellerUpiId: 'sharma@upi',
      verificationStatus: VerificationStatus.approved,
      status: SellerStatus.active,
      aiDailyLimit: 25,
    },
    create: {
      userId: sellerUser.id,
      storeName: 'Sharma General Store',
      storeSlug: 'sharma-store',
      storeDescription:
        'Your friendly neighborhood grocery and essentials store',
      location: 'Hyderabad, India',
      phone: '9876543210',
      contactNumber: '9876543210',
      sellerUpiId: 'sharma@upi',
      verificationStatus: VerificationStatus.approved,
      status: SellerStatus.active,
      aiDailyLimit: 25,
    },
  });
  console.log(`Seller store: ${seller.storeName} (${seller.storeSlug})`);

  // 3. Demo Products
  const p1 = await prisma.product.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      sellerId: seller.id,
      title: 'Organic Basmati Rice (5kg)',
      description: 'Premium aged long-grain aromatic basmati rice.',
      price: 499.0,
      category: 'Groceries',
      tags: ['rice', 'organic', 'grains'],
      stock: 50,
      lowStockThreshold: 5,
      status: ProductStatus.active,
      variants: {
        create: [
          { size: '5kg', stock: 30, priceOverride: 499.0, sku: 'RICE-5KG' },
          { size: '1kg', stock: 20, priceOverride: 110.0, sku: 'RICE-1KG' },
        ],
      },
    },
  });

  const p2 = await prisma.product.upsert({
    where: { id: '22222222-2222-2222-2222-222222222222' },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222222',
      sellerId: seller.id,
      title: 'Cold Pressed Mustard Oil (1L)',
      description: '100% pure kachi ghani mustard oil for healthy cooking.',
      price: 180.0,
      category: 'Oils & Ghee',
      tags: ['oil', 'cooking', 'mustard'],
      stock: 40,
      lowStockThreshold: 10,
      status: ProductStatus.active,
      variants: {
        create: [
          { size: '1L', stock: 25, priceOverride: 180.0, sku: 'OIL-1L' },
          { size: '500ml', stock: 15, priceOverride: 95.0, sku: 'OIL-500ML' },
        ],
      },
    },
  });
  console.log(`Products seeded: ${p1.title}, ${p2.title}`);

  // 4. Demo Buyer
  const buyerEmail = 'buyer@snapshop.local';
  const buyer = await prisma.user.upsert({
    where: { email: buyerEmail },
    update: {
      role: Role.buyer,
      onboarded: true,
      emailVerified: true,
      isBlocked: false,
    },
    create: {
      email: buyerEmail,
      name: 'Priya Patel',
      phone: '9123456789',
      role: Role.buyer,
      onboarded: true,
      emailVerified: true,
      passwordHash: defaultPasswordHash,
    },
  });
  console.log(`Buyer user: ${buyer.email}`);

  // 5. Demo Volunteer
  const volunteerEmail = 'volunteer@snapshop.local';
  const volunteer = await prisma.user.upsert({
    where: { email: volunteerEmail },
    update: {
      role: Role.volunteer,
      onboarded: true,
      emailVerified: true,
      isBlocked: false,
    },
    create: {
      email: volunteerEmail,
      name: 'Anil Kumar',
      phone: '9811223344',
      role: Role.volunteer,
      onboarded: true,
      emailVerified: true,
      passwordHash: defaultPasswordHash,
    },
  });
  console.log(`Volunteer user: ${volunteer.email}`);
  console.log('Seeding completed successfully!');
}

main()
  .catch(error => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
