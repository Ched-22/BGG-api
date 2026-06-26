import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { seedAdmin } from './seed-admin';
import { seedTechnicians } from './seed-technicians';
import { seedClients } from './seed-clients';
import { seedInventory } from './seed-inventory';
import { seedTasks } from './seed-tasks';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('=== BGG — seed completo da base de dados ===\n');

  const admin = await seedAdmin(prisma);
  console.log('');

  const technicians = await seedTechnicians(prisma);
  console.log('');

  const clients = await seedClients(prisma);
  console.log('');

  const inventory = await seedInventory(prisma);
  console.log('');

  const tasks = await seedTasks(prisma);
  console.log('');

  console.log('=== Resumo ===');
  console.log(`Admin:       ${admin.email} (${admin.action})`);
  console.log(`Técnicos:    ${technicians.total} (${technicians.created} novos, ${technicians.updated} atualizados)`);
  console.log(`Clientes:    ${clients.total} (${clients.created} novos, ${clients.updated} atualizados)`);
  console.log(`Estoque:     ${inventory.total} (${inventory.created} novos, ${inventory.updated} atualizados)`);
  console.log(`Tarefas:     ${tasks.total} (${tasks.created} novas, ${tasks.updated} atualizadas)`);
  console.log('');
  console.log('Credenciais de teste:');
  console.log(`  Admin:     ${admin.email} / ${admin.password}`);
  console.log(`  Técnicos:  tecnico1@bgggarage.com … tecnico8@bgggarage.com / ${technicians.password}`);
  console.log('');
  console.log('=== Seed concluído ===');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
