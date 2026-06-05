import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/** Mirrors BGG-Admin mock techs (`bggData.js`). */
const TECHNICIANS = [
  {
    name: 'Técnico 1',
    email: 'tecnico1@bgggarage.com',
    phone: '+551199990001',
    skills: ['PPF', 'Vitrificação', 'Polimento'],
    available: true,
    scheduleLabel: 'Seg–Sáb · 08:00–18:00',
    workloadHours: 4,
  },
  {
    name: 'Técnico 2',
    email: 'tecnico2@bgggarage.com',
    phone: '+551199990002',
    skills: ['Motos', 'Detalhamento Exterior', 'Polimento'],
    available: true,
    scheduleLabel: 'Seg–Sex · 09:00–19:00',
    workloadHours: 3,
  },
  {
    name: 'Técnico 3',
    email: 'tecnico3@bgggarage.com',
    phone: '+551199990003',
    skills: ['Proteção Cerâmica', 'Polimento', 'Vitrificação'],
    available: true,
    scheduleLabel: 'Seg–Sáb · 08:00–17:00',
    workloadHours: 5,
  },
  {
    name: 'Técnico 4',
    email: 'tecnico4@bgggarage.com',
    phone: '+551199990004',
    skills: ['Couro', 'Detalhamento Interior'],
    available: false,
    scheduleLabel: 'Seg–Sex · 08:00–17:00',
    workloadHours: 6,
  },
  {
    name: 'Técnico 5',
    email: 'tecnico5@bgggarage.com',
    phone: '+551199990005',
    skills: ['Couro', 'Higienização', 'Detalhamento Interior'],
    available: true,
    scheduleLabel: 'Seg–Sex · 08:00–18:00',
    workloadHours: 4,
  },
  {
    name: 'Técnico 6',
    email: 'tecnico6@bgggarage.com',
    phone: '+551199990006',
    skills: ['Higienização', 'Ozônio'],
    available: true,
    scheduleLabel: 'Ter–Sáb · 09:00–18:00',
    workloadHours: 7,
  },
  {
    name: 'Técnico 7',
    email: 'tecnico7@bgggarage.com',
    phone: '+551199990007',
    skills: ['PPF', 'Detalhamento Exterior'],
    available: true,
    scheduleLabel: 'Seg–Sex · 08:00–18:00',
    workloadHours: 2,
  },
  {
    name: 'Técnico 8',
    email: 'tecnico8@bgggarage.com',
    phone: '+551199990008',
    skills: ['Motos', 'Polimento'],
    available: true,
    scheduleLabel: 'Seg–Sáb · 10:00–19:00',
    workloadHours: 3,
  },
];

const DEFAULT_PASSWORD = 'tecnico123';
const STARTED_AT = new Date('2024-01-15');

async function main() {
  const plainPassword = process.env.SEED_TECHNICIAN_PASSWORD || DEFAULT_PASSWORD;
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  let created = 0;
  let updated = 0;

  for (const tech of TECHNICIANS) {
    const existing = await prisma.user.findUnique({
      where: { email: tech.email },
    });

    const data = {
      name: tech.name,
      role: Role.TECHNICIAN,
      active: true,
      phone: tech.phone,
      startedAt: STARTED_AT,
      skills: tech.skills,
      available: tech.available,
      scheduleLabel: tech.scheduleLabel,
      workloadHours: tech.workloadHours,
    };

    if (existing) {
      await prisma.user.update({
        where: { email: tech.email },
        data,
      });
      updated += 1;
    } else {
      await prisma.user.create({
        data: {
          ...data,
          email: tech.email,
          password: passwordHash,
        },
      });
      created += 1;
    }
  }

  console.log(`Seed technicians: ${created} created, ${updated} updated (${TECHNICIANS.length} total).`);
  console.log(`Login password (new users only): ${plainPassword}`);
  console.log('Emails: tecnico1@bgggarage.com … tecnico8@bgggarage.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
