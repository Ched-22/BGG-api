import { Client, Prisma, Quote } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  asServiceCodes,
  ServiceSnapshot,
} from '../catalog/service-snapshots.util';

const SERVICE_LABELS: Record<string, string> = {
  polim: 'Polimento técnico',
  vitri: 'Vitrificação cerâmica',
  ppf: 'PPF — película de proteção',
  couro: 'Higienização de couro',
  motor: 'Detalhamento de motor',
  ozonio: 'Tratamento de ozônio',
  rodas: 'Restauração de rodas',
  farol: 'Polimento de faróis',
};

const SERVICE_DURATION_HOURS: Record<string, number> = {
  polim: 2,
  vitri: 4,
  ppf: 8,
  couro: 2,
  motor: 1.5,
  ozonio: 1.5,
  rodas: 2,
  farol: 1,
};

const DEFAULT_DURATION_HOURS = 2;

const PLACEHOLDER_ENDERECO = {
  unidade: '—',
  logradouro: '—',
  cidade: '—',
  estado: '—',
  cep: '—',
};

export function asServiceIds(services: unknown): string[] {
  return asServiceCodes(services);
}

export function readQuoteSnapshots(quote: Quote): ServiceSnapshot[] {
  if (!Array.isArray(quote.serviceSnapshots)) return [];
  return quote.serviceSnapshots as ServiceSnapshot[];
}

export function sumServiceDurationHours(serviceIds: string[]): number {
  if (!serviceIds.length) return DEFAULT_DURATION_HOURS;
  const total = serviceIds.reduce(
    (sum, id) => sum + (SERVICE_DURATION_HOURS[id] ?? 0),
    0,
  );
  return total > 0 ? total : DEFAULT_DURATION_HOURS;
}

export function sumDurationHoursFromQuote(quote: Quote): number {
  const snapshots = readQuoteSnapshots(quote);
  if (snapshots.length) {
    const hours = snapshots.reduce((sum, row) => sum + row.durationMinutes / 60, 0);
    return hours > 0 ? hours : DEFAULT_DURATION_HOURS;
  }
  return sumServiceDurationHours(asServiceIds(quote.services));
}

export function formatServiceLabels(serviceIds: string[]): string {
  if (!serviceIds.length) return '—';
  return serviceIds
    .map((id) => SERVICE_LABELS[id] || id)
    .join(', ');
}

export function formatServiceLabelsFromQuote(quote: Quote): string {
  const snapshots = readQuoteSnapshots(quote);
  if (snapshots.length) {
    return snapshots.map((row) => row.name).join(', ');
  }
  return formatServiceLabels(asServiceIds(quote.services));
}

export function buildProjetoFromQuote(quote: Quote): string {
  const plate = quote.plate?.trim() || '—';
  const brand = quote.brand?.trim() || '';
  const model = quote.model?.trim() || '';
  const vehicle = `${brand} ${model}`.trim();
  return vehicle ? `${vehicle} · ${plate}` : plate;
}

export function buildEnderecoFromClient(client: Client | null): Prisma.InputJsonValue {
  if (!client) return PLACEHOLDER_ENDERECO as Prisma.InputJsonValue;
  return {
    unidade: client.addressUnit?.trim() || '—',
    logradouro: client.street?.trim() || '—',
    cidade: client.city?.trim() || '—',
    estado: client.state?.trim() || '—',
    cep: client.zipCode?.trim() || '—',
  } as Prisma.InputJsonValue;
}

export async function resolveClientByEmail(
  prisma: PrismaService,
  email: string | null | undefined,
): Promise<Client | null> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return null;

  return prisma.client.findFirst({
    where: { email: { equals: normalized, mode: 'insensitive' } },
  });
}

export type QuoteTaskCreateData = {
  projeto: string;
  cliente: string;
  clienteEmail: string | null;
  clienteTelCountryCode: string | null;
  clienteTelNationalNumber: string | null;
  clientePreferredLanguage: Quote['clientPreferredLanguage'];
  servico: string;
  serviceCodes: string[];
  descricao: string;
  anotInternas: string | null;
  endereco: Prisma.InputJsonValue;
  clientId: string | null;
  duracaoHoras: number;
  orcamento: Prisma.InputJsonValue;
};

export async function buildTaskCreateDataFromQuote(
  prisma: PrismaService,
  quote: Quote,
): Promise<QuoteTaskCreateData> {
  const serviceIds = asServiceIds(quote.services);
  const client = await resolveClientByEmail(prisma, quote.clientEmail);
  const serviceLabel = formatServiceLabelsFromQuote(quote);

  return {
    projeto: buildProjetoFromQuote(quote),
    cliente: quote.clientName.trim(),
    clienteEmail: quote.clientEmail?.trim() || null,
    clienteTelCountryCode: quote.clientPhoneCountryCode?.trim() || null,
    clienteTelNationalNumber: quote.clientPhoneNationalNumber?.trim() || null,
    clientePreferredLanguage: quote.clientPreferredLanguage,
    servico: serviceLabel,
    serviceCodes: serviceIds,
    descricao:
      quote.notes?.trim() ||
      `Orçamento aprovado — serviços: ${serviceLabel}`,
    anotInternas: quote.internalNote?.trim() || null,
    endereco: buildEnderecoFromClient(client),
    clientId: client?.id ?? null,
    duracaoHoras: sumDurationHoursFromQuote(quote),
    orcamento: {
      valor: quote.total ?? 0,
      status: 'Aprovado',
      fatura: '—',
      metodo: '—',
      deposito: 0,
      saldo: quote.total ?? 0,
      currency: quote.currency ?? 'EUR',
    } as Prisma.InputJsonValue,
  };
}
