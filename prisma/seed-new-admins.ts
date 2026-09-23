import { PrismaClient, Role } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

const NEW_ADMINS = [
  { name: 'Maicon', email: 'maicon@bgggarage.com' },
  { name: 'Fernanda', email: 'fernanda@bgggarage.com' },
];

function generateTempPassword() {
  return crypto.randomBytes(9).toString('base64url');
}

export async function seedNewAdmins(prisma: PrismaClient) {
  const results: { action: 'created' | 'updated'; email: string; password: string }[] = [];

  for (const admin of NEW_ADMINS) {
    const plainPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const existing = await prisma.user.findUnique({ where: { email: admin.email } });

    if (existing) {
      await prisma.user.update({
        where: { email: admin.email },
        data: {
          role: Role.ADMIN,
          active: true,
          password: passwordHash,
        },
      });
      console.log(`Admin seed: updated ${admin.email}`);
      results.push({ action: 'updated', email: admin.email, password: plainPassword });
      continue;
    }

    await prisma.user.create({
      data: {
        name: admin.name,
        email: admin.email,
        password: passwordHash,
        role: Role.ADMIN,
        active: true,
      },
    });
    console.log(`Admin seed: created ${admin.email}`);
    results.push({ action: 'created', email: admin.email, password: plainPassword });
  }

  return results;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const results = await seedNewAdmins(prisma);
    console.log('\nTemporary passwords (share securely, then have each admin reset it):');
    for (const r of results) {
      console.log(`  ${r.email}: ${r.password}`);
    }
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
