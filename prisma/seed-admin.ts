import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const DEFAULT_ADMIN_EMAIL = 'admin@bgggarage.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

export async function seedAdmin(prisma: PrismaClient) {
  const email = process.env.SEED_ADMIN_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL;
  const plainPassword = process.env.SEED_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        name: 'Admin',
        role: Role.ADMIN,
        active: true,
        password: passwordHash,
      },
    });
    console.log(`Admin seed: updated ${email}`);
    return { action: 'updated' as const, email, password: plainPassword };
  }

  await prisma.user.create({
    data: {
      name: 'Admin',
      email,
      password: passwordHash,
      role: Role.ADMIN,
      active: true,
    },
  });

  console.log(`Admin seed: created ${email}`);
  return { action: 'created' as const, email, password: plainPassword };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await seedAdmin(prisma);
    console.log(`Password: ${result.password}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
