import { PrismaClient } from '@prisma/client';
import {
  normalizePlate,
  validatePlate,
} from '../src/common/plate-utils';

const prisma = new PrismaClient();

async function resolveClientForQuote(quote: {
  clientName: string;
  clientPhoneCountryCode: string;
  clientPhoneNationalNumber: string;
  clientEmail: string | null;
}) {
  const phoneCountryCode = String(quote.clientPhoneCountryCode || '').replace(
    /\D/g,
    '',
  );
  const phoneNationalNumber = String(
    quote.clientPhoneNationalNumber || '',
  ).replace(/\D/g, '');

  if (phoneCountryCode && phoneNationalNumber) {
    const byPhone = await prisma.client.findFirst({
      where: { phoneCountryCode, phoneNationalNumber },
    });
    if (byPhone) return byPhone.id;
  }

  const created = await prisma.client.create({
    data: {
      name: quote.clientName?.trim() || 'Cliente',
      phoneCountryCode: phoneCountryCode || '34',
      phoneNationalNumber: phoneNationalNumber || '0',
      email: quote.clientEmail?.trim() || undefined,
    },
  });
  return created.id;
}

async function upsertVehicle(
  clientId: string,
  quote: {
    plate: string;
    brand: string;
    model: string;
    year: number;
    color: string | null;
  },
) {
  const plate = normalizePlate(quote.plate);
  const existing = await prisma.vehicle.findUnique({ where: { plate } });

  const vehicleData = {
    brand: quote.brand?.trim() || '',
    model: quote.model?.trim() || '',
    year: Number(quote.year),
    color: quote.color?.trim() || undefined,
  };

  if (!existing) {
    await prisma.vehicle.create({
      data: { plate, clientId, ...vehicleData },
    });
    return 'created';
  }

  if (existing.clientId !== clientId) {
    console.warn(
      `SKIP plate conflict: ${plate} belongs to another client (quote plate: ${quote.plate})`,
    );
    return 'conflict';
  }

  await prisma.vehicle.update({
    where: { id: existing.id },
    data: vehicleData,
  });
  return 'updated';
}

async function main() {
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: 'asc' },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let invalid = 0;
  let conflicts = 0;

  for (const quote of quotes) {
    if (!validatePlate(quote.plate)) {
      invalid += 1;
      console.warn(
        `INVALID plate for quote ${quote.id}: "${quote.plate}" (client: ${quote.clientName})`,
      );
      continue;
    }

    const clientId = await resolveClientForQuote(quote);
    const result = await upsertVehicle(clientId, quote);

    if (result === 'created') created += 1;
    else if (result === 'updated') updated += 1;
    else if (result === 'conflict') conflicts += 1;
    else skipped += 1;
  }

  console.log(
    `Done. quotes=${quotes.length} created=${created} updated=${updated} invalid=${invalid} conflicts=${conflicts} skipped=${skipped}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
