import { Prisma, PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const today = new Date().toISOString().slice(0, 10);

type TaskSeed = {
  displayId: string;
  projeto: string;
  cliente: string;
  clienteEmail: string;
  clienteTel: string;
  servico: string;
  status: string;
  descricao: string;
  endereco: Prisma.InputJsonValue;
  dataAgendada?: string;
  horario?: string;
  baia?: number;
  duracaoHoras?: number;
  tecnico?: string;
  tecnicoStatus?: string;
  tecnicoNotas?: string;
  orcamento: Prisma.InputJsonValue;
  anexos?: Prisma.InputJsonValue;
  qa?: Prisma.InputJsonValue;
  agendaPreferencial?: string;
  log?: Prisma.InputJsonValue;
};

/** Mirrors BGG-Admin mock tasks (`bggData.js`). */
const TASKS: TaskSeed[] = [
  {
    displayId: 'TR-2841',
    projeto: 'Vitrificação Carbon Pro — Sedan',
    cliente: 'Cliente 18',
    clienteEmail: 'cliente18@exemplo.com',
    clienteTel: '+55 11 9 9821-4422',
    servico: 'Proteção Cerâmica',
    status: 'Agendado',
    descricao:
      'Aplicação de proteção cerâmica completa. Veículo previamente polido, sem necessidade de correção de pintura. Cliente solicitou cobertura também em rodas e vidros.',
    endereco: {
      unidade: 'Apto 1402, Torre B',
      logradouro: 'Rua Itaim, 220',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '04535-080',
    },
    dataAgendada: today,
    horario: '09:30',
    baia: 1,
    duracaoHoras: 1.5,
    tecnico: 'Técnico 3',
    tecnicoStatus: 'Confirmado',
    tecnicoNotas: 'Cliente preferiu chegada antes das 10h. Garagem subterrânea, vaga 42.',
    orcamento: {
      valor: 6200,
      status: 'Aprovado',
      fatura: 'FAT-00829',
      metodo: 'Cartão de Crédito',
      deposito: 1860,
      saldo: 4340,
    },
    anexos: [
      { name: 'fotos-veículo-1.jpg', type: 'image' },
      { name: 'fotos-veículo-2.jpg', type: 'image' },
      { name: 'termo-de-servico.pdf', type: 'pdf' },
    ],
    qa: { status: 'Pendente', notas: '', fotos: [], concluidoEm: '' },
    agendaPreferencial: 'Manhãs, segunda a sexta',
    log: [
      { t: 'Tarefa criada', w: 'Cliente · App', when: '14 mai · 11:22' },
      { t: 'Orçamento aprovado', w: 'Admin · Você', when: '16 mai · 09:14' },
      { t: 'Tarefa agendada para 21/05 às 09:30', w: 'Admin · Você', when: '18 mai · 14:02' },
      { t: 'Técnico 3 designado', w: 'Admin · Você', when: '20 mai · 16:45' },
    ],
  },
  {
    displayId: 'TR-2840',
    projeto: 'Restauração completa — Coupé',
    cliente: 'Cliente 12',
    clienteEmail: 'cliente12@exemplo.com',
    clienteTel: '+55 11 9 9774-2231',
    servico: 'Polimento e Vitrificação',
    status: 'Aguardando orçamento',
    descricao:
      'Coupé clássico com pintura original. Solicitação de polimento minucioso e vitrificação. Cliente pediu inspeção prévia antes da aprovação do orçamento.',
    endereco: {
      unidade: 'Casa',
      logradouro: 'Rua das Camélias, 482',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01415-002',
    },
    tecnico: '',
    tecnicoStatus: '—',
    orcamento: {
      valor: 4280,
      status: 'Pendente',
      fatura: '—',
      metodo: '—',
      deposito: 0,
      saldo: 4280,
    },
    anexos: [{ name: 'estado-pintura.jpg', type: 'image' }],
    qa: { status: '—', notas: '', fotos: [], concluidoEm: '' },
    agendaPreferencial: 'Quinta a sábado, manhãs',
    log: [
      { t: 'Tarefa criada', w: 'Cliente · App', when: '18 mai · 09:10' },
      { t: 'Inspeção interna concluída', w: 'Admin · Você', when: '18 mai · 14:22' },
    ],
  },
  {
    displayId: 'TR-2839',
    projeto: 'Higienização interior — SUV',
    cliente: 'Cliente 21',
    clienteEmail: 'cliente21@exemplo.com',
    clienteTel: '+55 11 9 9112-5587',
    servico: 'Detalhamento Interior',
    status: 'Não agendado',
    descricao:
      'Higienização completa de bancos em couro, painel, carpetes e teto. Cliente relatou manchas em banco traseiro.',
    endereco: {
      unidade: 'Sala 2104',
      logradouro: 'Av. Faria Lima, 4500',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '04538-132',
    },
    tecnico: '',
    tecnicoStatus: '—',
    orcamento: {
      valor: 1680,
      status: 'Aprovado',
      fatura: 'FAT-00828',
      metodo: 'Pix',
      deposito: 504,
      saldo: 1176,
    },
    anexos: [],
    qa: { status: '—', notas: '', fotos: [], concluidoEm: '' },
    agendaPreferencial: 'Tardes, terça e quinta',
    log: [
      { t: 'Tarefa criada', w: 'Cliente · App', when: '17 mai · 17:00' },
      { t: 'Orçamento aprovado', w: 'Cliente · App', when: '19 mai · 10:15' },
    ],
  },
  {
    displayId: 'TR-2838',
    projeto: 'Proteção cerâmica integral',
    cliente: 'Cliente 07',
    clienteEmail: 'cliente07@exemplo.com',
    clienteTel: '+55 11 9 9302-8821',
    servico: 'Proteção Cerâmica',
    status: 'Sem técnico',
    descricao:
      'Proteção cerâmica completa após correção de pintura. Veículo deve permanecer 48h em ambiente controlado.',
    endereco: {
      unidade: 'Garagem 12',
      logradouro: 'Av. Oscar Freire, 1203',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01426-001',
    },
    dataAgendada: '2026-05-23',
    horario: '08:00',
    baia: 1,
    duracaoHoras: 8,
    tecnico: '',
    tecnicoStatus: '—',
    orcamento: {
      valor: 7950,
      status: 'Aprovado',
      fatura: 'FAT-00824',
      metodo: 'Cartão de Crédito',
      deposito: 2385,
      saldo: 5565,
    },
    anexos: [
      { name: 'veículo-frente.jpg', type: 'image' },
      { name: 'veículo-lateral.jpg', type: 'image' },
    ],
    qa: { status: '—', notas: '', fotos: [], concluidoEm: '' },
    agendaPreferencial: 'Sábados pela manhã',
    log: [
      { t: 'Tarefa criada', w: 'Cliente · Site', when: '12 mai · 13:45' },
      { t: 'Orçamento aprovado', w: 'Admin · Você', when: '15 mai · 11:20' },
      { t: 'Tarefa agendada para 23/05 às 08:00', w: 'Admin · Você', when: '19 mai · 09:00' },
    ],
  },
  {
    displayId: 'TR-2837',
    projeto: 'PPF frontal completo',
    cliente: 'Cliente 09',
    clienteEmail: 'cliente09@exemplo.com',
    clienteTel: '+55 11 9 9882-0014',
    servico: 'PPF — Película Protetora',
    status: 'Pronto para QA',
    descricao:
      'Aplicação de película protetora em capô, paralamas dianteiros, faróis e retrovisores.',
    endereco: {
      unidade: 'Box 14',
      logradouro: 'Alameda Lorena, 401',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01424-001',
    },
    dataAgendada: '2026-05-19',
    horario: '08:30',
    baia: 2,
    duracaoHoras: 8,
    tecnico: 'Técnico 1',
    tecnicoStatus: 'Concluído',
    tecnicoNotas: 'Trabalho finalizado às 17h20. Cliente conferiu acabamento e aprovou visualmente.',
    orcamento: {
      valor: 12400,
      status: 'Aprovado',
      fatura: 'FAT-00811',
      metodo: 'Cartão de Crédito',
      deposito: 3720,
      saldo: 8680,
    },
    anexos: [
      { name: 'PPF-antes-1.jpg', type: 'image' },
      { name: 'PPF-antes-2.jpg', type: 'image' },
    ],
    qa: {
      status: 'Pronto para Revisão',
      notas: '',
      fotos: ['PPF-depois-1.jpg', 'PPF-depois-2.jpg', 'PPF-detalhe-faróis.jpg'],
      concluidoEm: '2026-05-20 17:20',
    },
    agendaPreferencial: 'Manhãs',
    log: [
      { t: 'Tarefa criada', w: 'Cliente · Site', when: '08 mai · 10:05' },
      { t: 'Orçamento aprovado', w: 'Cliente · App', when: '10 mai · 14:22' },
      { t: 'Tarefa agendada para 19/05 às 08:30', w: 'Admin · Você', when: '12 mai · 09:30' },
      { t: 'Técnico 1 designado', w: 'Admin · Você', when: '12 mai · 09:32' },
      { t: 'Tarefa concluída pelo técnico', w: 'Técnico 1', when: '20 mai · 17:20' },
    ],
  },
  {
    displayId: 'TR-2836',
    projeto: 'Tratamento de couro completo',
    cliente: 'Cliente 14',
    clienteEmail: 'cliente14@exemplo.com',
    clienteTel: '+55 11 9 9220-6611',
    servico: 'Tratamento de Couro',
    status: 'Agendado',
    descricao:
      'Hidratação, limpeza profunda e proteção UV para bancos, painel e volante em couro natural.',
    endereco: {
      unidade: 'Casa',
      logradouro: 'Av. Brasil, 1500',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01430-001',
    },
    dataAgendada: today,
    horario: '14:00',
    baia: 2,
    duracaoHoras: 2,
    tecnico: 'Técnico 5',
    tecnicoStatus: 'A caminho',
    orcamento: {
      valor: 1980,
      status: 'Aprovado',
      fatura: 'FAT-00821',
      metodo: 'Pix',
      deposito: 594,
      saldo: 1386,
    },
    anexos: [],
    qa: { status: '—', notas: '', fotos: [], concluidoEm: '' },
    agendaPreferencial: 'Tardes',
    log: [],
  },
  {
    displayId: 'TR-2835',
    projeto: 'Detalhamento exterior — Sedan executivo',
    cliente: 'Cliente 03',
    clienteEmail: 'cliente03@exemplo.com',
    clienteTel: '+55 21 9 9821-7700',
    servico: 'Detalhamento Exterior',
    status: 'Nova solicitação',
    descricao:
      'Detalhamento exterior completo, polimento leve e selamento. Cliente novo, primeira tarefa pela plataforma.',
    endereco: {
      unidade: 'Cobertura',
      logradouro: 'Av. Atlântica, 88',
      cidade: 'Rio de Janeiro',
      estado: 'RJ',
      cep: '22070-001',
    },
    tecnico: '',
    tecnicoStatus: '—',
    orcamento: {
      valor: 2380,
      status: 'Pendente',
      fatura: '—',
      metodo: '—',
      deposito: 0,
      saldo: 2380,
    },
    anexos: [],
    qa: { status: '—', notas: '', fotos: [], concluidoEm: '' },
    agendaPreferencial: 'Próxima semana, manhã',
    log: [{ t: 'Tarefa criada', w: 'Cliente · Site', when: '20 mai · 22:14' }],
  },
  {
    displayId: 'TR-2834',
    projeto: 'Detalhamento motos — Ducati',
    cliente: 'Cliente 25',
    clienteEmail: 'cliente25@exemplo.com',
    clienteTel: '+55 11 9 9445-0091',
    servico: 'Detalhamento Motos',
    status: 'Agendado',
    descricao:
      'Detalhamento completo Ducati Panigale. Atenção a quadro de carbono e detalhes anodizados.',
    endereco: {
      unidade: 'Garagem 3',
      logradouro: 'Rua Joaquim Floriano, 72',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '04534-000',
    },
    dataAgendada: today,
    horario: '16:30',
    baia: 1,
    duracaoHoras: 1.5,
    tecnico: 'Técnico 2',
    tecnicoStatus: 'Confirmado',
    orcamento: {
      valor: 1450,
      status: 'Aprovado',
      fatura: 'FAT-00815',
      metodo: 'Cartão de Crédito',
      deposito: 435,
      saldo: 1015,
    },
    anexos: [],
    qa: { status: '—', notas: '', fotos: [], concluidoEm: '' },
    agendaPreferencial: 'Tardes',
    log: [],
  },
  {
    displayId: 'TR-2833',
    projeto: 'Higienização premium SUV',
    cliente: 'Cliente 06',
    clienteEmail: 'cliente06@exemplo.com',
    clienteTel: '+55 11 9 9123-8800',
    servico: 'Higienização Premium',
    status: 'Cancelado',
    descricao:
      'Higienização completa com ozônio. Cliente cancelou após reagendar duas vezes.',
    endereco: {
      unidade: 'Casa',
      logradouro: 'Rua da Consolação, 3088',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01416-000',
    },
    dataAgendada: '2026-05-18',
    horario: '10:00',
    tecnico: '',
    tecnicoStatus: '—',
    orcamento: {
      valor: 2840,
      status: 'Cancelado',
      fatura: '—',
      metodo: '—',
      deposito: 0,
      saldo: 0,
    },
    anexos: [],
    qa: { status: '—', notas: '', fotos: [], concluidoEm: '' },
    agendaPreferencial: '—',
    log: [
      { t: 'Tarefa criada', w: 'Cliente · App', when: '09 mai · 14:00' },
      { t: 'Tarefa cancelada pelo cliente', w: 'Cliente · App', when: '17 mai · 19:00' },
    ],
  },
];

async function resolveClientId(clienteEmail: string, cliente: string) {
  const client = await prisma.client.findFirst({
    where: {
      OR: [{ email: clienteEmail }, { name: cliente }],
    },
    select: { id: true },
  });
  return client?.id ?? null;
}

async function upsertTask(seed: TaskSeed) {
  const clientId = await resolveClientId(seed.clienteEmail, seed.cliente);

  const data = {
    projeto: seed.projeto,
    cliente: seed.cliente,
    clienteEmail: seed.clienteEmail,
    clienteTel: seed.clienteTel,
    servico: seed.servico,
    status: seed.status,
    descricao: seed.descricao,
    endereco: seed.endereco,
    dataAgendada: seed.dataAgendada ?? null,
    horario: seed.horario ?? null,
    baia: seed.baia ?? null,
    duracaoHoras: seed.duracaoHoras ?? null,
    tecnico: seed.tecnico ?? '',
    tecnicoStatus: seed.tecnicoStatus ?? '—',
    tecnicoNotas: seed.tecnicoNotas ?? null,
    orcamento: seed.orcamento,
    anexos: seed.anexos ?? [],
    qa: seed.qa ?? { status: '—', notas: '', fotos: [], concluidoEm: '' },
    agendaPreferencial: seed.agendaPreferencial ?? '—',
    log: seed.log ?? [],
    clientId,
  };

  const existing = await prisma.task.findUnique({
    where: { displayId: seed.displayId },
  });

  if (existing) {
    await prisma.task.update({
      where: { displayId: seed.displayId },
      data,
    });
    return 'updated' as const;
  }

  await prisma.task.create({
    data: {
      displayId: seed.displayId,
      ...data,
    },
  });
  return 'created' as const;
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const task of TASKS) {
    const result = await upsertTask(task);
    if (result === 'created') created += 1;
    else updated += 1;
  }

  const scheduledToday = TASKS.filter((t) => t.dataAgendada === today).length;
  console.log(
    `Seed tasks: ${created} created, ${updated} updated (${TASKS.length} total). ` +
      `${scheduledToday} agendadas para hoje (${today}).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
