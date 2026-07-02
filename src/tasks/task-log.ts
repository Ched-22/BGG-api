import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';

export const TASK_LOG_ACTIONS = {
  TASK_CREATED: 'TASK_CREATED',
  TASK_EDITED: 'TASK_EDITED',
  TECH_ASSIGNED: 'TECH_ASSIGNED',
  TASK_SCHEDULED: 'TASK_SCHEDULED',
  QUOTE_CREATED: 'QUOTE_CREATED',
  QUOTE_SUBMITTED: 'QUOTE_SUBMITTED',
  QUOTE_UPDATED: 'QUOTE_UPDATED',
  QUOTE_APPROVED: 'QUOTE_APPROVED',
  QUOTE_SENT: 'QUOTE_SENT',
  QUOTE_RESENT: 'QUOTE_RESENT',
  TASK_CANCELLED: 'TASK_CANCELLED',
  REQUEST_REJECTED: 'REQUEST_REJECTED',
  QA_APPROVED: 'QA_APPROVED',
  CLIENT_PICKUP_NOTIFIED: 'CLIENT_PICKUP_NOTIFIED',
  PAYMENT_UPDATED: 'PAYMENT_UPDATED',
} as const;

export type TaskLogAction =
  (typeof TASK_LOG_ACTIONS)[keyof typeof TASK_LOG_ACTIONS];

export interface TaskLogActor {
  id: string;
  name: string;
  role: Role | string;
}

export interface TaskLogEntry {
  action: string;
  label: string;
  actorId?: string;
  actorName: string;
  actorRole: string;
  at: string;
  meta?: Record<string, unknown>;
}

function formatDateBr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

function resolveLogLabel(
  action: string,
  meta: Record<string, unknown> = {},
): string {
  switch (action) {
    case TASK_LOG_ACTIONS.TASK_CREATED:
      return 'Tarefa criada';
    case TASK_LOG_ACTIONS.TASK_EDITED:
      return 'Tarefa editada';
    case TASK_LOG_ACTIONS.TECH_ASSIGNED:
      return `${String(meta.techName || 'Técnico')} designado`;
    case TASK_LOG_ACTIONS.TASK_SCHEDULED: {
      const date = meta.dataAgendada
        ? formatDateBr(String(meta.dataAgendada))
        : '—';
      const time = meta.horario ? String(meta.horario) : '—';
      const baia = meta.baia != null ? ` · Baia ${meta.baia}` : '';
      const dropoffDate = meta.clientDropoffDate
        ? formatDateBr(String(meta.clientDropoffDate))
        : null;
      const dropoffTime = meta.clientDropoffTime
        ? String(meta.clientDropoffTime)
        : null;
      const dropoffDiffers = dropoffDate
        && dropoffTime
        && (meta.clientDropoffDate !== meta.dataAgendada
          || meta.clientDropoffTime !== meta.horario);
      const dropoffNote = dropoffDiffers
        ? ` · Entrega cliente ${dropoffDate} às ${dropoffTime}`
        : '';
      return `Tarefa agendada para ${date} às ${time}${baia}${dropoffNote}`;
    }
    case TASK_LOG_ACTIONS.QUOTE_CREATED:
      return 'Orçamento criado';
    case TASK_LOG_ACTIONS.QUOTE_SUBMITTED:
      return 'Orçamento enviado para aprovação';
    case TASK_LOG_ACTIONS.QUOTE_UPDATED:
      return 'Orçamento atualizado';
    case TASK_LOG_ACTIONS.QUOTE_APPROVED:
      return 'Orçamento aprovado';
    case TASK_LOG_ACTIONS.QUOTE_SENT:
      return 'Orçamento enviado ao cliente';
    case TASK_LOG_ACTIONS.QUOTE_RESENT:
      return 'Orçamento reenviado ao cliente';
    case TASK_LOG_ACTIONS.TASK_CANCELLED:
      return 'Tarefa cancelada';
    case TASK_LOG_ACTIONS.REQUEST_REJECTED:
      return 'Solicitação rejeitada';
    case TASK_LOG_ACTIONS.QA_APPROVED:
      return 'QA aprovado — tarefa concluída';
    case TASK_LOG_ACTIONS.CLIENT_PICKUP_NOTIFIED:
      return 'Cliente notificado — veículo disponível para retirada';
    case TASK_LOG_ACTIONS.PAYMENT_UPDATED: {
      const status = meta.settlementStatus === 'paid'
        ? 'Pago'
        : meta.settlementStatus === 'prepaid'
          ? 'Pagamento antecipado'
          : 'Pendente';
      const method = meta.paymentMethod ? ` · ${String(meta.paymentMethod)}` : '';
      return `Pagamento registado — ${status}${method}`;
    }
    default:
      return action;
  }
}

export function isKnownLogAction(action: string): action is TaskLogAction {
  return Object.values(TASK_LOG_ACTIONS).includes(action as TaskLogAction);
}

export function buildLogEntry(
  action: string,
  actor: TaskLogActor,
  meta?: Record<string, unknown>,
  options?: { overrideLabel?: string; at?: string | Date },
): TaskLogEntry {
  if (!isKnownLogAction(action)) {
    throw new BadRequestException(`logAction inválido: ${action}`);
  }

  const safeMeta = meta && typeof meta === 'object' ? meta : {};
  const actorName = actor.name?.trim() || 'Usuário';
  const atValue = options?.at;
  const at = atValue
    ? (typeof atValue === 'string' ? atValue : atValue.toISOString())
    : new Date().toISOString();

  return {
    action,
    label: options?.overrideLabel || resolveLogLabel(action, safeMeta),
    actorId: actor.id,
    actorName,
    actorRole: String(actor.role),
    at,
    ...(Object.keys(safeMeta).length ? { meta: safeMeta } : {}),
  };
}

type QuoteHistorySource = {
  id: string;
  createdAt: Date;
  submittedAt: Date | null;
  approvedAt: Date | null;
  createdBy?: { id: string; name: string | null } | null;
};

export function buildQuoteBackfillEntries(quote: QuoteHistorySource): TaskLogEntry[] {
  const entries: TaskLogEntry[] = [];
  const techActor: TaskLogActor = quote.createdBy
    ? {
        id: quote.createdBy.id,
        name: quote.createdBy.name?.trim() || 'Técnico',
        role: Role.TECHNICIAN,
      }
    : { id: 'system', name: 'Sistema', role: 'SYSTEM' };

  entries.push(
    buildLogEntry(
      TASK_LOG_ACTIONS.QUOTE_CREATED,
      techActor,
      { quoteId: quote.id },
      { at: quote.createdAt },
    ),
  );

  if (quote.submittedAt) {
    entries.push(
      buildLogEntry(
        TASK_LOG_ACTIONS.QUOTE_SUBMITTED,
        techActor,
        { quoteId: quote.id },
        { at: quote.submittedAt },
      ),
    );
  }

  if (quote.approvedAt) {
    entries.push(
      buildLogEntry(
        TASK_LOG_ACTIONS.QUOTE_APPROVED,
        { id: 'system', name: 'Administrador', role: Role.ADMIN },
        { quoteId: quote.id },
        { at: quote.approvedAt },
      ),
    );
  }

  return entries;
}

export function mergeQuoteHistoryEntries(
  activityLog: unknown,
  quote: QuoteHistorySource,
): TaskLogEntry[] {
  const logged = (Array.isArray(activityLog) ? activityLog : []) as TaskLogEntry[];
  if (logged.length > 0) {
    return logged;
  }
  return buildQuoteBackfillEntries(quote);
}

export function actorFromUser(user: {
  id: string;
  email: string;
  role: Role;
  name?: string;
}): TaskLogActor {
  return {
    id: user.id,
    name: user.name?.trim() || user.email.split('@')[0],
    role: user.role,
  };
}
