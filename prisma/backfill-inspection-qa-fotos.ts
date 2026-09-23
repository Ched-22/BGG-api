import { PrismaClient } from '@prisma/client';
import { parsePhase } from '../src/vehicle-inspections/inspection.types';

const prisma = new PrismaClient();

function collectPhasePhotoUrls(exitData: unknown): string[] {
  const phase = parsePhase(exitData);
  const urls = [...phase.generalPhotoUrls];
  for (const item of phase.items) {
    urls.push(...item.photoUrls);
  }
  return [...new Set(urls.filter((url) => typeof url === 'string' && url.trim()))];
}

async function main() {
  const rows = await prisma.vehicleInspection.findMany({
    where: {
      reportStatus: { in: ['PENDING_REVIEW', 'SENT_TO_CLIENT'] },
      taskDisplayId: { not: null },
    },
  });

  let updated = 0;
  for (const row of rows) {
    if (!row.taskDisplayId) continue;

    const task = await prisma.task.findUnique({
      where: { displayId: row.taskDisplayId },
    });
    if (!task) continue;

    const fotos = collectPhasePhotoUrls(row.exitData);
    const exitNotes = parsePhase(row.exitData).notes.trim();
    const existingQa =
      task.qa && typeof task.qa === 'object' && !Array.isArray(task.qa)
        ? (task.qa as Record<string, unknown>)
        : {};

    const nextQa = {
      ...existingQa,
      fotos,
    };

    await prisma.task.update({
      where: { displayId: row.taskDisplayId },
      data: {
        ...(exitNotes && !task.tecnicoNotas?.trim() ? { tecnicoNotas: exitNotes } : {}),
        qa: nextQa,
      },
    });
    updated += 1;
    console.log(`Updated ${row.taskDisplayId}: ${fotos.length} photo(s)`);
  }

  console.log(`Done. ${updated} task(s) updated.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
