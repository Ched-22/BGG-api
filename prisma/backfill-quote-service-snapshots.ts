import { PrismaClient, Quote } from '@prisma/client';
import {
  asServiceCodes,
  pickUnitPrice,
  ServiceSnapshot,
  sumSnapshotSubtotal,
} from '../src/catalog/service-snapshots.util';

const prisma = new PrismaClient();

function isEmptySnapshots(value: unknown) {
  if (value == null) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

async function buildLegacySnapshots(quote: Quote): Promise<ServiceSnapshot[]> {
  const codes = asServiceCodes(quote.services);
  if (!codes.length) return [];

  const services = await prisma.catalogService.findMany({
    where: { code: { in: codes } },
    include: {
      prices: { orderBy: { effectiveFrom: 'asc' }, take: 1 },
    },
  });

  const byCode = new Map(services.map((s) => [s.code, s]));
  const snapshots: ServiceSnapshot[] = [];

  for (const code of codes) {
    const service = byCode.get(code);
    if (!service?.prices[0]) continue;
    const price = service.prices[0];
    snapshots.push({
      serviceId: service.id,
      code: service.code,
      name: service.name,
      unitPrice: pickUnitPrice(price, quote.vehicleSize),
      priceVersionId: price.id,
      durationMinutes: service.durationMinutes,
    });
  }

  const subtotal = sumSnapshotSubtotal(snapshots);
  const expected = subtotal - (quote.discount || 0);
  if (snapshots.length && Math.abs(expected - quote.total) > 0.01) {
    const last = snapshots[snapshots.length - 1];
    const delta = quote.total - (expected - last.unitPrice);
    last.unitPrice = Math.max(0, delta);
    last.approximate = true;
  }

  return snapshots;
}

async function main() {
  const quotes = await prisma.quote.findMany();
  let updated = 0;

  for (const quote of quotes) {
    if (!isEmptySnapshots(quote.serviceSnapshots)) continue;
    const snapshots = await buildLegacySnapshots(quote);
    if (!snapshots.length) continue;

    await prisma.quote.update({
      where: { id: quote.id },
      data: { serviceSnapshots: snapshots },
    });
    updated += 1;
  }

  console.log(`Backfill quote snapshots: ${updated} updated of ${quotes.length} quotes.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
