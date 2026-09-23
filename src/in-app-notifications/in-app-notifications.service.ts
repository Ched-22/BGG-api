import { Injectable, NotFoundException } from '@nestjs/common';
import { InAppNotification, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateInAppNotificationInput,
  IN_APP_NOTIFICATION_TYPES,
  InAppNotificationDto,
} from './in-app-notification.types';

type AuthUser = {
  id: string;
  email: string;
  role: Role;
  name?: string;
};

const CLOSED_TASK_STATUSES = new Set(['Concluído', 'Cancelado']);
const RETENTION_DAYS = 30;
const DEDUPE_HOURS = 24;

@Injectable()
export class InAppNotificationsService {
  constructor(private prisma: PrismaService) {}

  async purgeStale() {
    const retentionCutoff = new Date();
    retentionCutoff.setDate(retentionCutoff.getDate() - RETENTION_DAYS);

    await this.prisma.inAppNotification.deleteMany({
      where: {
        OR: [
          { resolvedAt: { not: null } },
          { createdAt: { lt: retentionCutoff } },
        ],
      },
    });
  }

  async createForUser(recipientId: string, input: CreateInAppNotificationInput) {
    return this.prisma.inAppNotification.create({
      data: {
        recipientId,
        type: input.type,
        title: input.title,
        body: input.body,
        severity: input.severity || 'info',
        meta: (input.meta || undefined) as Prisma.InputJsonValue | undefined,
        action: (input.action || undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async createDeduplicated(
    recipientId: string,
    input: CreateInAppNotificationInput,
  ) {
    const since = new Date();
    since.setHours(since.getHours() - DEDUPE_HOURS);

    const metaFilter = this.buildMetaFilter(input.meta);
    const existing = await this.prisma.inAppNotification.findFirst({
      where: {
        recipientId,
        type: input.type,
        resolvedAt: null,
        createdAt: { gte: since },
        ...metaFilter,
      },
    });
    if (existing) return existing;

    return this.createForUser(recipientId, input);
  }

  async fanOutToAdmins(input: CreateInAppNotificationInput) {
    const admins = await this.prisma.user.findMany({
      where: { role: Role.ADMIN, active: true },
      select: { id: true },
    });

    const created: InAppNotification[] = [];
    for (const admin of admins) {
      const row = await this.createDeduplicated(admin.id, input);
      created.push(row);
    }
    return created;
  }

  async resolveByMeta(
    type: string,
    metaKey: string,
    metaValue: string,
  ) {
    const rows = await this.prisma.inAppNotification.findMany({
      where: {
        type,
        resolvedAt: null,
      },
    });

    const matching = rows.filter((row) => {
      const meta = row.meta as Record<string, unknown> | null;
      return meta?.[metaKey] === metaValue;
    });

    if (!matching.length) return 0;

    await this.prisma.inAppNotification.updateMany({
      where: { id: { in: matching.map((r) => r.id) } },
      data: { resolvedAt: new Date() },
    });

    return matching.length;
  }

  async resolveByTaskDisplayId(taskDisplayId: string) {
    const types = [
      IN_APP_NOTIFICATION_TYPES.TASK_ASSIGNED,
      IN_APP_NOTIFICATION_TYPES.TASK_SCHEDULED,
      IN_APP_NOTIFICATION_TYPES.QA_PENDING_REVIEW,
      IN_APP_NOTIFICATION_TYPES.TASK_COMPLETED,
    ];

    const rows = await this.prisma.inAppNotification.findMany({
      where: {
        type: { in: types },
        resolvedAt: null,
      },
    });

    const matching = rows.filter((row) => {
      const meta = row.meta as Record<string, unknown> | null;
      return meta?.taskDisplayId === taskDisplayId;
    });

    if (!matching.length) return 0;

    await this.prisma.inAppNotification.updateMany({
      where: { id: { in: matching.map((r) => r.id) } },
      data: { resolvedAt: new Date() },
    });

    return matching.length;
  }

  private buildMetaFilter(meta?: Record<string, unknown>) {
    if (meta?.quoteId) {
      return {
        meta: { path: ['quoteId'], equals: String(meta.quoteId) },
      };
    }
    if (meta?.taskDisplayId) {
      return {
        meta: { path: ['taskDisplayId'], equals: String(meta.taskDisplayId) },
      };
    }
    return {};
  }

  private mapRow(row: InAppNotification): InAppNotificationDto {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      severity: row.severity,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      action: (row.action as InAppNotificationDto['action']) ?? null,
      derived: false,
    };
  }

  async buildDerivedChecklistItems(user: AuthUser): Promise<InAppNotificationDto[]> {
    if (user.role !== Role.TECHNICIAN) return [];

    const technicianName = user.name?.trim();
    if (!technicianName) return [];

    const tasks = await this.prisma.task.findMany({
      where: {
        tecnico: { equals: technicianName, mode: 'insensitive' },
        dataAgendada: { not: null },
        horario: { not: null },
        status: { notIn: ['Cancelado', 'Concluído'] },
      },
      select: {
        displayId: true,
        projeto: true,
        cliente: true,
        status: true,
      },
    });

    if (!tasks.length) return [];

    const displayIds = tasks.map((t) => t.displayId);
    const inspections = await this.prisma.vehicleInspection.findMany({
      where: { taskDisplayId: { in: displayIds } },
    });
    const inspectionByTask = new Map(
      inspections
        .filter((i) => i.taskDisplayId)
        .map((i) => [i.taskDisplayId as string, i]),
    );

    const items: InAppNotificationDto[] = [];
    const now = new Date().toISOString();

    for (const task of tasks) {
      if (CLOSED_TASK_STATUSES.has(task.status)) continue;

      const inspection = inspectionByTask.get(task.displayId);
      const plate = task.projeto?.split('·').pop()?.trim() || task.displayId;
      const action = {
        target: 'checklist',
        id: task.displayId,
        route: 'agendamentos',
      };

      if (!inspection?.entryFinalizedAt) {
        items.push({
          id: `derived:${IN_APP_NOTIFICATION_TYPES.CHECKLIST_ENTRY_PENDING}:${task.displayId}`,
          type: IN_APP_NOTIFICATION_TYPES.CHECKLIST_ENTRY_PENDING,
          title: `Checklist de entrada pendente · ${plate}`,
          body: `${task.cliente} — finalize a inspeção de entrada`,
          severity: 'warn',
          readAt: null,
          createdAt: now,
          action,
          derived: true,
        });
        continue;
      }

      if (!inspection.exitFinalizedAt) {
        items.push({
          id: `derived:${IN_APP_NOTIFICATION_TYPES.CHECKLIST_EXIT_PENDING}:${task.displayId}`,
          type: IN_APP_NOTIFICATION_TYPES.CHECKLIST_EXIT_PENDING,
          title: `Checklist de saída pendente · ${plate}`,
          body: `${task.cliente} — finalize a inspeção de saída`,
          severity: 'warn',
          readAt: null,
          createdAt: now,
          action,
          derived: true,
        });
      }
    }

    return items;
  }

  async listForUser(
    user: AuthUser,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {},
  ) {
    await this.purgeStale();

    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(50, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.InAppNotificationWhereInput = {
      recipientId: user.id,
      resolvedAt: null,
      ...(options.unreadOnly ? { readAt: null } : {}),
    };

    const [total, rows, unreadPersisted] = await Promise.all([
      this.prisma.inAppNotification.count({ where }),
      this.prisma.inAppNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.inAppNotification.count({
        where: { recipientId: user.id, resolvedAt: null, readAt: null },
      }),
    ]);

    const derived = await this.buildDerivedChecklistItems(user);

    const persisted = rows.map((row) => this.mapRow(row));
    const merged = [...derived, ...persisted].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const unreadCount = unreadPersisted + derived.length;

    return {
      data: merged,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      unreadCount,
    };
  }

  async unreadCount(user: AuthUser) {
    await this.purgeStale();

    const [unreadPersisted, derivedChecklist] = await Promise.all([
      this.prisma.inAppNotification.count({
        where: { recipientId: user.id, resolvedAt: null, readAt: null },
      }),
      this.buildDerivedChecklistItems(user),
    ]);

    return {
      unreadCount: unreadPersisted + derivedChecklist.length,
    };
  }

  async markRead(id: string, user: AuthUser) {
    if (id.startsWith('derived:')) {
      return { ok: true, derived: true };
    }

    const row = await this.prisma.inAppNotification.findUnique({ where: { id } });
    if (!row || row.recipientId !== user.id) {
      throw new NotFoundException('Notificação não encontrada');
    }

    if (!row.readAt) {
      await this.prisma.inAppNotification.update({
        where: { id },
        data: { readAt: new Date() },
      });
    }

    return { ok: true };
  }

  async markAllRead(user: AuthUser) {
    await this.prisma.inAppNotification.updateMany({
      where: { recipientId: user.id, readAt: null, resolvedAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async notifyQuoteSubmitted(quote: {
    id: string;
    clientName: string;
    brand: string;
    model: string;
    plate: string;
  }) {
    const label = `${quote.brand} ${quote.model} · ${quote.plate}`.trim();
    await this.fanOutToAdmins({
      type: IN_APP_NOTIFICATION_TYPES.QUOTE_PENDING_APPROVAL,
      title: 'Orçamento aguardando aprovação',
      body: `${quote.clientName} — ${label}`,
      severity: 'gold',
      meta: { quoteId: quote.id },
      action: { target: 'quote', id: quote.id, route: 'quotes' },
    });
  }

  async notifyQuoteApproved(quote: {
    id: string;
    clientName: string;
    brand: string;
    model: string;
    plate: string;
    createdById?: string | null;
  }) {
    await this.resolveByMeta(
      IN_APP_NOTIFICATION_TYPES.QUOTE_PENDING_APPROVAL,
      'quoteId',
      quote.id,
    );

    if (!quote.createdById) return;

    const label = `${quote.brand} ${quote.model} · ${quote.plate}`.trim();
    await this.createDeduplicated(quote.createdById, {
      type: IN_APP_NOTIFICATION_TYPES.QUOTE_APPROVED,
      title: 'Orçamento aprovado',
      body: `${quote.clientName} — ${label}`,
      severity: 'success',
      meta: { quoteId: quote.id },
      action: { target: 'quote', id: quote.id, route: 'orcamentos' },
    });
  }

  async notifyTaskAssigned(task: {
    displayId: string;
    projeto: string;
    cliente: string;
    tecnico: string;
  }) {
    const techUsers = await this.findTechniciansByName(task.tecnico);
    for (const tech of techUsers) {
      await this.createDeduplicated(tech.id, {
        type: IN_APP_NOTIFICATION_TYPES.TASK_ASSIGNED,
        title: 'Tarefa designada',
        body: `${task.cliente} — ${task.projeto}`,
        severity: 'info',
        meta: { taskDisplayId: task.displayId },
        action: { target: 'task', id: task.displayId, route: 'agendamentos' },
      });
    }
  }

  async notifyTaskScheduled(task: {
    displayId: string;
    projeto: string;
    cliente: string;
    tecnico: string;
    dataAgendada: string;
    horario: string;
  }) {
    const techUsers = await this.findTechniciansByName(task.tecnico);
    const when = `${task.dataAgendada} às ${task.horario}`;
    for (const tech of techUsers) {
      await this.createDeduplicated(tech.id, {
        type: IN_APP_NOTIFICATION_TYPES.TASK_SCHEDULED,
        title: 'Tarefa agendada',
        body: `${task.cliente} — ${when}`,
        severity: 'info',
        meta: { taskDisplayId: task.displayId },
        action: { target: 'task', id: task.displayId, route: 'agendamentos' },
      });
    }
  }

  async notifyQaPendingReview(task: {
    displayId: string;
    projeto: string;
    cliente: string;
  }) {
    const plate = task.projeto?.split('·').pop()?.trim() || task.displayId;
    await this.fanOutToAdmins({
      type: IN_APP_NOTIFICATION_TYPES.QA_PENDING_REVIEW,
      title: `QA aguardando revisão · ${plate}`,
      body: `${task.cliente} — tarefa pronta para revisão`,
      severity: 'gold',
      meta: { taskDisplayId: task.displayId },
      action: { target: 'task', id: task.displayId, route: 'tasks' },
    });
  }

  async notifyTaskCompleted(task: {
    displayId: string;
    projeto: string;
    cliente: string;
  }) {
    await this.resolveByTaskDisplayId(task.displayId);

    const plate = task.projeto?.split('·').pop()?.trim() || task.displayId;
    await this.fanOutToAdmins({
      type: IN_APP_NOTIFICATION_TYPES.TASK_COMPLETED,
      title: `Tarefa concluída · ${plate}`,
      body: `${task.cliente} — serviço finalizado`,
      severity: 'success',
      meta: { taskDisplayId: task.displayId },
      action: { target: 'task', id: task.displayId, route: 'tasks' },
    });
  }

  private async findTechniciansByName(name: string) {
    const trimmed = name?.trim();
    if (!trimmed) return [];

    return this.prisma.user.findMany({
      where: {
        role: Role.TECHNICIAN,
        active: true,
        name: { equals: trimmed, mode: 'insensitive' },
      },
      select: { id: true },
    });
  }
}
