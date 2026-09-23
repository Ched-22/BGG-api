import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InspectionReportStatus, Prisma, Role, ClientPreferredLanguage } from '@prisma/client';
import { normalizePreferredLanguage } from '../common/client-preferred-language';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QuoteTaskCreateData } from '../quotes/quote-task-mapper';
import { TaskLogService } from './task-log.service';
import {
  TASK_LOG_ACTIONS,
  actorFromUser,
  mergeQuoteHistoryEntries,
} from './task-log';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service';

type AuthUser = {
  id: string;
  email: string;
  role: Role;
  name?: string;
};

const TECHNICIAN_PATCH_KEYS = new Set([
  'logAction',
  'logMeta',
  'tecnicoNotas',
  'tecnicoStatus',
  'qa',
]);

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private taskLogService: TaskLogService,
    private inAppNotifications: InAppNotificationsService,
  ) {}

  private async nextDisplayId() {
    const rows = await this.prisma.task.findMany({
      where: { displayId: { startsWith: 'TR-' } },
      select: { displayId: true },
    });

    const max = rows.reduce((highest, row) => {
      const match = row.displayId.match(/^TR-(\d+)$/);
      const value = match ? Number.parseInt(match[1], 10) : 0;
      return value > highest ? value : highest;
    }, 2841);

    return `TR-${max + 1}`;
  }

  private stripLogForRole<T extends { log?: unknown }>(task: T, role: Role): T {
    if (role === Role.TECHNICIAN) {
      const { log: _log, ...rest } = task;
      return rest as T;
    }
    return task;
  }

  async findAll(user: AuthUser) {
    const where: Prisma.TaskWhereInput = {};

    if (user.role === Role.TECHNICIAN) {
      const technicianName = user.name?.trim();
      if (!technicianName) return [];

      where.tecnico = { equals: technicianName, mode: 'insensitive' };
      where.dataAgendada = { not: null };
      where.horario = { not: null };
      where.status = { not: 'Cancelado' };
    }

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return tasks.map((task) => this.stripLogForRole(task, user.role));
  }

  async findByRouteId(routeId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        OR: [{ id: routeId }, { displayId: routeId }],
      },
    });
    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }
    return task;
  }

  async findByRouteIdForUser(routeId: string, user: AuthUser) {
    const task = await this.findByRouteId(routeId);
    return this.stripLogForRole(task, user.role);
  }

  private asObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private assertTechnicianPatchAllowed(dto: UpdateTaskDto, role: Role) {
    if (role !== Role.TECHNICIAN) return;

    const keys = Object.keys(dto).filter(
      (key) => dto[key as keyof UpdateTaskDto] !== undefined,
    );
    const invalid = keys.filter((key) => !TECHNICIAN_PATCH_KEYS.has(key));
    if (invalid.length > 0) {
      throw new ForbiddenException('Sem permissão para alterar estes campos');
    }
  }

  async update(routeId: string, dto: UpdateTaskDto, user: AuthUser) {
    this.assertTechnicianPatchAllowed(dto, user.role);

    const current = await this.findByRouteId(routeId);

    if (user.role === Role.TECHNICIAN) {
      const technicianName = user.name?.trim();
      if (
        !technicianName
        || !current.tecnico
        || current.tecnico.toLowerCase() !== technicianName.toLowerCase()
      ) {
        throw new ForbiddenException('Sem permissão para alterar esta tarefa');
      }
    }

    const data: Prisma.TaskUpdateInput = {};

    if (dto.status !== undefined) data.status = dto.status;
    if (dto.tecnico !== undefined) data.tecnico = dto.tecnico;
    if (dto.tecnicoStatus !== undefined) data.tecnicoStatus = dto.tecnicoStatus;
    if (dto.tecnicoNotas !== undefined) data.tecnicoNotas = dto.tecnicoNotas;
    if (dto.dataAgendada !== undefined) data.dataAgendada = dto.dataAgendada;
    if (dto.horario !== undefined) data.horario = dto.horario;
    if (dto.clientDropoffDate !== undefined) {
      data.clientDropoffDate = dto.clientDropoffDate;
    }
    if (dto.clientDropoffTime !== undefined) {
      data.clientDropoffTime = dto.clientDropoffTime;
    }
    if (dto.baia !== undefined) data.baia = dto.baia;
    if (dto.duracaoHoras !== undefined) data.duracaoHoras = dto.duracaoHoras;
    if (dto.clientePreferredLanguage !== undefined) {
      data.clientePreferredLanguage = normalizePreferredLanguage(dto.clientePreferredLanguage);
    }

    if (dto.orcamento !== undefined) {
      data.orcamento = {
        ...this.asObject(current.orcamento),
        ...dto.orcamento,
      } as Prisma.InputJsonValue;
    }

    if (dto.qa !== undefined) {
      data.qa = {
        ...this.asObject(current.qa),
        ...dto.qa,
      } as Prisma.InputJsonValue;
    }

    if (dto.logAction) {
      const actor = actorFromUser(user);
      const entry = this.taskLogService.buildEntry(
        dto.logAction,
        actor,
        dto.logMeta,
      );
      data.log = this.taskLogService.appendToLogArray(current.log, entry);
    }

    const updated = await this.prisma.task.update({
      where: { id: current.id },
      data,
    });

    await this.emitTaskNotifications(current, updated, dto);

    return this.stripLogForRole(updated, user.role);
  }

  private async emitTaskNotifications(
    current: { displayId: string; projeto: string; cliente: string; tecnico: string | null; dataAgendada: string | null; horario: string | null; status: string },
    updated: { displayId: string; projeto: string; cliente: string; tecnico: string | null; dataAgendada: string | null; horario: string | null; status: string },
    dto: UpdateTaskDto,
  ) {
    if (dto.tecnico?.trim() && dto.tecnico.trim() !== (current.tecnico || '').trim()) {
      await this.inAppNotifications.notifyTaskAssigned({
        displayId: updated.displayId,
        projeto: updated.projeto,
        cliente: updated.cliente,
        tecnico: updated.tecnico || '',
      });
    }

    const scheduledNow = !!(updated.dataAgendada?.trim() && updated.horario?.trim());
    const wasScheduled = !!(current.dataAgendada?.trim() && current.horario?.trim());
    const scheduleChanged = dto.dataAgendada !== undefined || dto.horario !== undefined;
    if (scheduledNow && (!wasScheduled || scheduleChanged)) {
      await this.inAppNotifications.notifyTaskScheduled({
        displayId: updated.displayId,
        projeto: updated.projeto,
        cliente: updated.cliente,
        tecnico: updated.tecnico || '',
        dataAgendada: updated.dataAgendada!,
        horario: updated.horario!,
      });
    }

    if (dto.status === 'Pronto para QA' && current.status !== 'Pronto para QA') {
      await this.inAppNotifications.notifyQaPendingReview({
        displayId: updated.displayId,
        projeto: updated.projeto,
        cliente: updated.cliente,
      });
    }

    if (dto.status === 'Concluído' && current.status !== 'Concluído') {
      await this.inAppNotifications.notifyTaskCompleted({
        displayId: updated.displayId,
        projeto: updated.projeto,
        cliente: updated.cliente,
      });
    }
  }

  async notifyReadyForPickup(
    routeId: string,
    qaNotes: string | undefined,
    user: AuthUser,
  ) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem notificar o cliente');
    }

    const current = await this.findByRouteId(routeId);
    if (current.status !== 'Pronto para QA') {
      throw new BadRequestException('Tarefa não está aguardando revisão');
    }

    const existingQa = this.asObject(current.qa);
    const inspection = await this.prisma.vehicleInspection.findUnique({
      where: { taskDisplayId: current.displayId },
    });

    if (inspection?.reportStatus === InspectionReportStatus.PENDING_REVIEW) {
      await this.prisma.vehicleInspection.update({
        where: { id: inspection.id },
        data: {
          reportStatus: InspectionReportStatus.SENT_TO_CLIENT,
          sentToClientAt: new Date(),
        },
      });
    }

    const actor = actorFromUser(user);
    const entry = this.taskLogService.buildEntry(
      TASK_LOG_ACTIONS.CLIENT_PICKUP_NOTIFIED,
      actor,
    );

    const updated = await this.prisma.task.update({
      where: { id: current.id },
      data: {
        status: 'Concluído',
        qa: {
          ...existingQa,
          status: 'Enviado ao cliente',
          notas: qaNotes?.trim() || (existingQa.notas as string) || '',
        } as Prisma.InputJsonValue,
        log: this.taskLogService.appendToLogArray(current.log, entry),
      },
    });

    await this.inAppNotifications.notifyTaskCompleted({
      displayId: updated.displayId,
      projeto: updated.projeto,
      cliente: updated.cliente,
    });

    return this.stripLogForRole(updated, user.role);
  }

  async create(dto: CreateTaskDto, user: AuthUser) {
    const displayId = await this.nextDisplayId();
    const scheduled = !!(dto.dataAgendada?.trim() && dto.horario?.trim());

    const endereco = {
      unidade: dto.addressUnit?.trim() || '—',
      logradouro: dto.street?.trim() || '—',
      cidade: dto.city?.trim() || '—',
      estado: dto.state?.trim() || '—',
      cep: dto.zipCode?.trim() || '—',
    };

    const orcamento = {
      valor: 0,
      status: 'Pendente',
      fatura: '—',
      metodo: '—',
      deposito: 0,
      saldo: 0,
      currency: 'EUR',
    };

    const qa = { status: '—', notas: '', fotos: [], concluidoEm: '' };
    const actor = actorFromUser(user);
    const log = [
      this.taskLogService.buildEntry(TASK_LOG_ACTIONS.TASK_CREATED, actor),
    ];

    const clientePreferredLanguage = await this.resolveTaskLanguage(dto);

    const created = await this.prisma.task.create({
      data: {
        displayId,
        projeto: dto.projeto.trim(),
        cliente: dto.cliente.trim(),
        clienteEmail: dto.clienteEmail?.trim() || null,
        clienteTelCountryCode: dto.clienteTelCountryCode?.trim() || null,
        clienteTelNationalNumber: dto.clienteTelNationalNumber?.trim() || null,
        clientePreferredLanguage,
        servico: dto.servico?.trim() || '',
        status: scheduled ? 'Agendado' : 'Não agendado',
        descricao: dto.descricao?.trim() || '',
        plate: dto.plate.trim(),
        plateCountry: dto.plateCountry?.trim() || 'ES',
        brand: dto.brand.trim(),
        model: dto.model.trim(),
        year: dto.year,
        anotInternas: dto.anotInternas?.trim() || null,
        anotPropriedade: dto.anotPropriedade?.trim() || null,
        endereco,
        dataAgendada: dto.dataAgendada?.trim() || null,
        horario: dto.horario?.trim() || null,
        baia: scheduled ? 1 : null,
        duracaoHoras: scheduled ? 1.5 : null,
        tecnico: '',
        tecnicoStatus: '—',
        orcamento,
        anexos: [] as Prisma.InputJsonValue,
        qa,
        agendaPreferencial: '—',
        log: log as unknown as Prisma.InputJsonValue[],
        clientId: dto.clientId || null,
      },
    });

    return this.stripLogForRole(created, user.role);
  }

  async createFromQuoteData(
    data: QuoteTaskCreateData,
    user: AuthUser,
    quote: {
      id: string;
      createdAt: Date;
      submittedAt: Date | null;
      approvedAt: Date | null;
      activityLog?: unknown;
      createdBy?: { id: string; name: string | null } | null;
    },
  ) {
    const displayId = await this.nextDisplayId();
    const actor = actorFromUser(user);
    const quoteHistory = mergeQuoteHistoryEntries(quote.activityLog, quote);
    const taskCreatedEntry = this.taskLogService.buildEntry(
      TASK_LOG_ACTIONS.TASK_CREATED,
      actor,
    );
    const log = [...quoteHistory, taskCreatedEntry];
    const qa = { status: '—', notas: '', fotos: [], concluidoEm: '' };

    const created = await this.prisma.task.create({
      data: {
        displayId,
        projeto: data.projeto,
        cliente: data.cliente,
        clienteEmail: data.clienteEmail,
        clienteTelCountryCode: data.clienteTelCountryCode,
        clienteTelNationalNumber: data.clienteTelNationalNumber,
        clientePreferredLanguage: data.clientePreferredLanguage,
        servico: data.servico,
        serviceCodes: data.serviceCodes,
        status: 'Não agendado',
        descricao: data.descricao,
        anotInternas: data.anotInternas,
        anotPropriedade: null,
        endereco: data.endereco,
        dataAgendada: null,
        horario: null,
        baia: null,
        duracaoHoras: data.duracaoHoras,
        tecnico: '',
        tecnicoStatus: '—',
        orcamento: data.orcamento,
        anexos: [] as Prisma.InputJsonValue,
        qa,
        agendaPreferencial: '—',
        log: log as unknown as Prisma.InputJsonValue[],
        clientId: data.clientId,
      },
    });

    return this.stripLogForRole(created, user.role);
  }

  private async resolveTaskLanguage(dto: {
    clientePreferredLanguage?: string;
    clientId?: string;
  }): Promise<ClientPreferredLanguage> {
    if (dto.clientePreferredLanguage) {
      return normalizePreferredLanguage(dto.clientePreferredLanguage);
    }
    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: dto.clientId },
      });
      return normalizePreferredLanguage(client?.preferredLanguage);
    }
    return ClientPreferredLanguage.es;
  }
}
