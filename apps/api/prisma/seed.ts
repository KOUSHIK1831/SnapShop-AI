import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@snapshop.local')
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';

  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  const passwordHash = await hash(password);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'admin',
      onboarded: true,
      emailVerified: true,
      isBlocked: false,
    },
    create: {
      email,
      name: 'Platform Admin',
      role: 'admin',
      onboarded: true,
      emailVerified: true,
      passwordHash,
    },
  });

  console.log(`Admin ready: ${admin.email} (${admin.id})`);
}

main()
  .catch(error => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
