import { Prisma } from '@prisma/client';

export const PAYMENT_METHODS = [
  'multibanco',
  'cash',
  'card',
  'mbWay',
  'bankTransfer',
  'sepaDirectDebit',
  'cheque',
  'other',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SETTLEMENT_STATUSES = ['pending', 'paid', 'prepaid'] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const PAYMENT_STATUSES = ['pending', 'installmentsOpen', 'completed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const REVENUE_ELIGIBLE_STATUSES = ['Pronto para QA', 'Concluído'] as const;

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  multibanco: 'Multibanco',
  cash: 'Dinheiro',
  card: 'Cartão',
  mbWay: 'MB Way',
  bankTransfer: 'Transferência bancária',
  sepaDirectDebit: 'Débito direto SEPA',
  cheque: 'Cheque',
  other: 'Outro',
};

const SETTLEMENT_LABELS: Record<SettlementStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  prepaid: 'Pagamento antecipado',
};

export interface TaskPaymentShape {
  settlementStatus: string;
  isInstallment: boolean;
  installmentCount: number | null;
  installmentsPaid: number;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function readOrcamentoAmounts(orcamento: Prisma.JsonValue | null) {
  if (!orcamento || typeof orcamento !== 'object' || Array.isArray(orcamento)) {
    return { valor: 0, deposito: 0, saldo: 0 };
  }
  const row = orcamento as { valor?: unknown; deposito?: unknown; saldo?: unknown };
  const valor = Number(row.valor);
  const deposito = Number(row.deposito);
  const safeValor = Number.isFinite(valor) ? valor : 0;
  const safeDeposito = Number.isFinite(deposito) ? deposito : 0;
  const saldoRaw = Number(row.saldo);
  const saldo = Number.isFinite(saldoRaw)
    ? saldoRaw
    : roundMoney(Math.max(safeValor - safeDeposito, 0));
  return {
    valor: safeValor,
    deposito: safeDeposito,
    saldo: roundMoney(Math.max(saldo, 0)),
  };
}

export function derivePaymentStatus(
  payment: TaskPaymentShape | null | undefined,
): PaymentStatus {
  if (!payment || payment.settlementStatus === 'pending') {
    return 'pending';
  }
  if (payment.settlementStatus === 'prepaid') {
    return 'completed';
  }
  if (payment.settlementStatus === 'paid') {
    if (
      payment.isInstallment
      && payment.installmentCount
      && payment.installmentsPaid < payment.installmentCount
    ) {
      return 'installmentsOpen';
    }
    return 'completed';
  }
  return 'pending';
}

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '—';
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] ?? method;
}

export function settlementStatusLabel(status: string): string {
  return SETTLEMENT_LABELS[status as SettlementStatus] ?? status;
}

export function isValidIban(value: string): boolean {
  const normalized = value.replace(/\s/g, '').toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalized);
}

export function normalizeIban(value: string): string {
  return value.replace(/\s/g, '').toUpperCase();
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function isSettlementStatus(value: string): value is SettlementStatus {
  return (SETTLEMENT_STATUSES as readonly string[]).includes(value);
}

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}
