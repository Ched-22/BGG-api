import { PrismaClient, ServiceCategory } from '@prisma/client';

const prisma = new PrismaClient();

const CATALOG_SEED: Array<{
  code: string;
  name: string;
  description: string;
  durationMinutes: number;
  serviceCategory: ServiceCategory;
  prices: { pequeno: number; medio: number; grande: number };
}> = [
  { code: 'polim', name: 'Pulido técnico', description: 'Corrección de pintura en 1 etapa', durationMinutes: 120, serviceCategory: ServiceCategory.EXTERIOR, prices: { pequeno: 75, medio: 95, grande: 120 } },
  { code: 'vitri', name: 'Vitrificación cerámica', description: 'Protección cerámica de alto nivel', durationMinutes: 240, serviceCategory: ServiceCategory.COMPLETE, prices: { pequeno: 280, medio: 350, grande: 440 } },
  { code: 'ppf', name: 'PPF — película de protección', description: 'Frontal completo, capó + parachoques', durationMinutes: 480, serviceCategory: ServiceCategory.COMPLETE, prices: { pequeno: 620, medio: 780, grande: 980 } },
  { code: 'couro', name: 'Higiene de cuero', description: 'Asientos + salpicadero + acabados', durationMinutes: 120, serviceCategory: ServiceCategory.INTERIOR, prices: { pequeno: 55, medio: 70, grande: 90 } },
  { code: 'motor', name: 'Detallado de motor', description: 'Limpieza y acabado', durationMinutes: 90, serviceCategory: ServiceCategory.EXTERIOR, prices: { pequeno: 45, medio: 55, grande: 70 } },
  { code: 'ozonio', name: 'Tratamiento de ozono', description: 'Desinfección completa del habitáculo', durationMinutes: 90, serviceCategory: ServiceCategory.INTERIOR, prices: { pequeno: 35, medio: 45, grande: 55 } },
  { code: 'rodas', name: 'Restauración de llantas', description: 'Pulido + sellador por llanta', durationMinutes: 120, serviceCategory: ServiceCategory.EXTERIOR, prices: { pequeno: 95, medio: 120, grande: 150 } },
  { code: 'farol', name: 'Pulido de faros', description: 'Restauración óptica', durationMinutes: 60, serviceCategory: ServiceCategory.EXTERIOR, prices: { pequeno: 30, medio: 35, grande: 45 } },
];

const SKILL_TO_CODE: Record<string, string> = {
  PPF: 'ppf',
  Vitrificação: 'vitri',
  'Proteção Cerâmica': 'vitri',
  Polimento: 'polim',
  Couro: 'couro',
  'Detalhamento Exterior': 'motor',
  'Detalhamento Interior': 'couro',
  Higienização: 'ozonio',
  Ozônio: 'ozonio',
  'Restauração de rodas': 'rodas',
  Faróis: 'farol',
};

async function main() {
  let created = 0;
  let updated = 0;

  for (const item of CATALOG_SEED) {
    const existing = await prisma.catalogService.findUnique({ where: { code: item.code } });
    if (existing) {
      await prisma.catalogService.update({
        where: { id: existing.id },
        data: {
          name: item.name,
          description: item.description,
          durationMinutes: item.durationMinutes,
          serviceCategory: item.serviceCategory,
          active: true,
        },
      });
      updated += 1;
      continue;
    }

    await prisma.catalogService.create({
      data: {
        code: item.code,
        name: item.name,
        description: item.description,
        durationMinutes: item.durationMinutes,
        serviceCategory: item.serviceCategory,
        prices: {
          create: {
            priceSmall: item.prices.pequeno,
            priceMedium: item.prices.medio,
            priceLarge: item.prices.grande,
          },
        },
      },
    });
    created += 1;
  }

  const servicesByCode = new Map(
    (await prisma.catalogService.findMany()).map((s) => [s.code, s.id]),
  );

  const technicians = await prisma.user.findMany({
    where: { role: 'TECHNICIAN' },
    select: { id: true, skills: true },
  });

  let links = 0;
  for (const tech of technicians) {
    const codes = new Set<string>();
    for (const skill of tech.skills) {
      const code = SKILL_TO_CODE[skill];
      if (code) codes.add(code);
    }
    if (!codes.size) continue;

    await prisma.technicianService.deleteMany({ where: { userId: tech.id } });
    for (const code of codes) {
      const serviceId = servicesByCode.get(code);
      if (!serviceId) continue;
      await prisma.technicianService.create({
        data: { userId: tech.id, catalogServiceId: serviceId },
      });
      links += 1;
    }
  }

  console.log(`Seed catalog: ${created} created, ${updated} updated (${CATALOG_SEED.length} total).`);
  console.log(`Technician service links: ${links}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
