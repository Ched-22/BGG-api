import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/** Mirrors BGG-Admin mock customers (`bggData.js` tasks + extras). */
const CLIENTS: Array<{ name: string; phone: string; email: string; status?: string }> = [
  { name: 'Cliente 03', email: 'cliente03@exemplo.com', phone: '+5521998217700' },
  { name: 'Cliente 06', email: 'cliente06@exemplo.com', phone: '+5511991238800' },
  { name: 'Cliente 07', email: 'cliente07@exemplo.com', phone: '+5511993028821' },
  { name: 'Cliente 09', email: 'cliente09@exemplo.com', phone: '+5511998820014' },
  { name: 'Cliente 12', email: 'cliente12@exemplo.com', phone: '+5511997742231' },
  { name: 'Cliente 14', email: 'cliente14@exemplo.com', phone: '+5511992206611' },
  { name: 'Cliente 18', email: 'cliente18@exemplo.com', phone: '+5511998214422' },
  { name: 'Cliente 21', email: 'cliente21@exemplo.com', phone: '+5511991125587' },
  { name: 'Cliente 25', email: 'cliente25@exemplo.com', phone: '+5511994450091' },
  { name: 'Cliente 02', email: 'cliente02@exemplo.com', phone: '+5511991001000', status: 'Inativo' },
  { name: 'Cliente 30', email: 'cliente30@exemplo.com', phone: '+5511991171013' },
  { name: 'Cliente 31', email: 'cliente31@exemplo.com', phone: '+5511991341026', status: 'VIP' },
  { name: 'Cliente 32', email: 'cliente32@exemplo.com', phone: '+5511991511039' },
  { name: 'Cliente 33', email: 'cliente33@exemplo.com', phone: '+5511991681052' },
  { name: 'Cliente 34', email: 'cliente34@exemplo.com', phone: '+5511991851065' },
  { name: 'Cliente 35', email: 'cliente35@exemplo.com', phone: '+5511992021078' },
  { name: 'Cliente 36', email: 'cliente36@exemplo.com', phone: '+5511992191091' },
  { name: 'Cliente 37', email: 'cliente37@exemplo.com', phone: '+5511992361104' },
];

async function upsertClient(client: { name: string; phone: string; email: string; status?: string }) {
  const existing = await prisma.client.findFirst({
    where: {
      OR: [{ email: client.email }, { name: client.name, phone: client.phone }],
    },
  });

  if (existing) {
    await prisma.client.update({
      where: { id: existing.id },
      data: {
        name: client.name,
        phone: client.phone,
        email: client.email,
        status: client.status ?? 'Ativo',
      },
    });
    return 'updated' as const;
  }

  await prisma.client.create({
    data: {
      name: client.name,
      phone: client.phone,
      email: client.email,
      status: client.status ?? 'Ativo',
    },
  });
  return 'created' as const;
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const client of CLIENTS) {
    const result = await upsertClient(client);
    if (result === 'created') created += 1;
    else updated += 1;
  }

  console.log(`Seed clients: ${created} created, ${updated} updated (${CLIENTS.length} total).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
