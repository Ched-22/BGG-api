import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Quote, QuoteStatus, Role, Prisma, ClientPreferredLanguage } from '@prisma/client';
import { normalizePreferredLanguage } from '../common/client-preferred-language';
import { normalizePlate, resolvePlateCountry } from '../common/plate-utils';
import { PrismaService } from '../prisma/prisma.service';
import { TaskLogService } from '../tasks/task-log.service';
import { TasksService } from '../tasks/tasks.service';
import { actorFromUser } from '../tasks/task-log';
import { buildTaskCreateDataFromQuote } from './quote-task-mapper';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { FindQuotesDto } from './dto/find-quotes.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import {
  ClientVehicleSyncService,
  QuoteSyncInput,
} from './client-vehicle-sync.service';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service';
import { ServiceCatalogService } from '../catalog/catalog.service';
import { asServiceCodes } from '../catalog/service-snapshots.util';

type AuthUser = {
  id: string;
  email: string;
  role: Role;
  name?: string;
};

const quoteInclude = {
  createdBy: { select: { id: true, name: true } },
};

@Injectable()
export class QuotesService {
  constructor(
    private prisma: PrismaService,
    private taskLogService: TaskLogService,
    private tasksService: TasksService,
    private clientVehicleSync: ClientVehicleSyncService,
    private inAppNotifications: InAppNotificationsService,
    private catalogService: ServiceCatalogService,
  ) {}

  async create(dto: CreateQuoteDto, user: AuthUser) {
    await this.assertTechnicianServicesAllowed(user, dto.services);
    const sync = await this.clientVehicleSync.syncForQuote(
      this.toSyncInput(dto),
    );
    const clientPreferredLanguage = await this.resolveQuoteLanguage(
      dto.clientPreferredLanguage,
      sync.syncedClientId,
    );
    const { clientId: _clientId, clientPreferredLanguage: _lang, ...quoteFields } = dto;
    const catalogFields = await this.buildCatalogFields(dto, undefined);

    const quote = await this.prisma.quote.create({
      data: {
        ...(quoteFields as any),
        ...catalogFields,
        clientPreferredLanguage,
        plate: normalizePlate(dto.plate, dto.plateCountry),
        plateCountry: resolvePlateCountry(dto.plateCountry),
        currency: dto.currency?.trim() || 'EUR',
        createdById: user.id,
      },
      include: quoteInclude,
    });

    await this.taskLogService.appendForQuote(
      quote,
      'QUOTE_CREATED',
      actorFromUser(user),
      { quoteId: quote.id },
      quote.createdAt,
    );

    return { ...quote, ...sync };
  }

  async findAll(dto: FindQuotesDto, user: AuthUser) {
    const scope = this.scopeForUser(user);
    const where: Prisma.QuoteWhereInput = {
      ...scope,
      ...this.buildListWhere(dto),
    };
    const skip = (dto.page - 1) * dto.limit;

    const [total, rows, pipeline] = await Promise.all([
      this.prisma.quote.count({ where }),
      this.prisma.quote.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: dto.limit,
        include: quoteInclude,
      }),
      this.getPipelineStats(scope, dto.search, dto.service),
    ]);

    return {
      data: rows,
      page: dto.page,
      limit: dto.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / dto.limit)),
      pipeline,
    };
  }

  private buildSearchWhere(search?: string): Prisma.QuoteWhereInput | undefined {
    const query = search?.trim();
    if (!query) return undefined;

    return {
      OR: [
        { clientName: { contains: query, mode: 'insensitive' } },
        { brand: { contains: query, mode: 'insensitive' } },
        { model: { contains: query, mode: 'insensitive' } },
        { plate: { contains: query.replace(/\W/g, ''), mode: 'insensitive' } },
        { id: { contains: query, mode: 'insensitive' } },
      ],
    };
  }

  private mapStatusFilter(status?: string): Prisma.QuoteWhereInput | undefined {
    const value = status?.trim();
    if (!value || value === 'Todos') return undefined;
    if (value === 'Pendente') {
      return { status: { in: [QuoteStatus.DRAFT, QuoteStatus.PENDING] } };
    }
    if (value === 'Aprovado') {
      return { status: QuoteStatus.APPROVED };
    }
    if (['Enviado', 'Rejeitado', 'Expirado'].includes(value)) {
      return { id: '__no_match__' };
    }
    return undefined;
  }

  private buildListWhere(dto: FindQuotesDto): Prisma.QuoteWhereInput {
    const parts: Prisma.QuoteWhereInput[] = [];
    const searchWhere = this.buildSearchWhere(dto.search);
    if (searchWhere) parts.push(searchWhere);

    const statusWhere = this.mapStatusFilter(dto.status);
    if (statusWhere) parts.push(statusWhere);

    const service = dto.service?.trim();
    if (service && service !== 'Todos') {
      parts.push({
        services: { string_contains: service },
      });
    }

    if (!parts.length) return {};
    return parts.length === 1 ? parts[0] : { AND: parts };
  }

  private async getPipelineStats(
    scope: Prisma.QuoteWhereInput,
    search?: string,
    service?: string,
  ) {
    const baseParts: Prisma.QuoteWhereInput[] = [scope];
    const searchWhere = this.buildSearchWhere(search);
    if (searchWhere) baseParts.push(searchWhere);

    const serviceValue = service?.trim();
    if (serviceValue && serviceValue !== 'Todos') {
      baseParts.push({ services: { string_contains: serviceValue } });
    }

    const baseWhere: Prisma.QuoteWhereInput = baseParts.length === 1
      ? baseParts[0]
      : { AND: baseParts };

    const [pendente, aprovado, todos] = await Promise.all([
      this.prisma.quote.aggregate({
        where: {
          ...baseWhere,
          status: { in: [QuoteStatus.DRAFT, QuoteStatus.PENDING] },
        },
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.quote.aggregate({
        where: { ...baseWhere, status: QuoteStatus.APPROVED },
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.quote.aggregate({
        where: baseWhere,
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);

    return {
      pendente: {
        count: pendente._count._all,
        total: pendente._sum.total ?? 0,
      },
      enviado: { count: 0, total: 0 },
      aprovado: {
        count: aprovado._count._all,
        total: aprovado._sum.total ?? 0,
      },
      rejeitadoExpirado: { count: 0, total: 0 },
      todos: {
        count: todos._count._all,
        total: todos._sum.total ?? 0,
      },
    };
  }

  async findOne(id: string, user: AuthUser) {
    const quote = await this.getQuoteOrThrow(id);
    this.assertCanAccess(quote, user);
    return this.prisma.quote.findUnique({
      where: { id },
      include: quoteInclude,
    });
  }

  async update(id: string, dto: UpdateQuoteDto, user: AuthUser) {
    const quote = await this.getQuoteOrThrow(id);
    this.assertCanAccess(quote, user);

    const merged = this.mergeQuoteForSync(quote, dto);
    const sync = await this.clientVehicleSync.syncForQuote(merged);
    const clientPreferredLanguage = await this.resolveQuoteLanguage(
      dto.clientPreferredLanguage ?? quote.clientPreferredLanguage,
      sync.syncedClientId,
    );
    const { clientId: _clientId, clientPreferredLanguage: _lang, ...updateData } = dto as any;
    updateData.clientPreferredLanguage = clientPreferredLanguage;
    if (dto.plate) {
      const plateCountry = resolvePlateCountry(dto.plateCountry ?? quote.plateCountry);
      updateData.plate = normalizePlate(dto.plate, plateCountry);
      updateData.plateCountry = plateCountry;
    } else     if (dto.plateCountry) {
      updateData.plateCountry = resolvePlateCountry(dto.plateCountry);
    }

    if (dto.services !== undefined) {
      await this.assertTechnicianServicesAllowed(user, dto.services);
    }
    const catalogFields = await this.buildCatalogFields(dto, quote);
    Object.assign(updateData, catalogFields);

    const updated = await this.prisma.quote.update({
      where: { id },
      data: updateData,
      include: quoteInclude,
    });

    return { ...updated, ...sync };
  }

  async submit(id: string, user: AuthUser) {
    const quote = await this.getQuoteOrThrow(id);
    this.assertCanAccess(quote, user);

    const sync = await this.clientVehicleSync.syncForQuote(
      this.mergeQuoteForSync(quote, {}),
    );

    const updated = await this.prisma.quote.update({
      where: { id },
      data: { status: 'PENDING', submittedAt: new Date() },
      include: quoteInclude,
    });

    await this.taskLogService.appendForQuote(
      updated,
      'QUOTE_SUBMITTED',
      actorFromUser(user),
      { quoteId: id },
      updated.submittedAt ?? undefined,
    );

    await this.inAppNotifications.notifyQuoteSubmitted({
      id: updated.id,
      clientName: updated.clientName,
      brand: updated.brand,
      model: updated.model,
      plate: updated.plate,
    });

    return { ...updated, ...sync };
  }

  async approve(id: string, user: AuthUser) {
    const quote = await this.getQuoteOrThrow(id);
    const updated = await this.prisma.quote.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: new Date() },
      include: quoteInclude,
    });
    await this.taskLogService.appendForQuote(
      { ...quote, approvedAt: updated.approvedAt },
      'QUOTE_APPROVED',
      actorFromUser(user),
      { quoteId: id },
      updated.approvedAt ?? undefined,
    );

    await this.inAppNotifications.notifyQuoteApproved({
      id: updated.id,
      clientName: updated.clientName,
      brand: updated.brand,
      model: updated.model,
      plate: updated.plate,
      createdById: updated.createdById,
    });

    return updated;
  }

  async sendToClient(id: string, user: AuthUser) {
    const quote = await this.getQuoteOrThrow(id);
    await this.taskLogService.appendForQuote(
      quote,
      'QUOTE_SENT',
      actorFromUser(user),
      { quoteId: id },
    );
    return this.prisma.quote.findUnique({
      where: { id },
      include: quoteInclude,
    });
  }

  async resendToClient(id: string, user: AuthUser) {
    const quote = await this.getQuoteOrThrow(id);
    await this.taskLogService.appendForQuote(
      quote,
      'QUOTE_RESENT',
      actorFromUser(user),
      { quoteId: id },
    );
    return this.prisma.quote.findUnique({
      where: { id },
      include: quoteInclude,
    });
  }

  async createTaskFromQuote(id: string, user: AuthUser) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: quoteInclude,
    });
    if (!quote) throw new NotFoundException('Orçamento não encontrado');

    if (quote.status !== QuoteStatus.APPROVED) {
      throw new BadRequestException(
        'Orçamento deve estar aprovado para criar tarefa',
      );
    }

    if (quote.linkedTaskDisplayId) {
      const existing = await this.prisma.task.findFirst({
        where: { displayId: quote.linkedTaskDisplayId },
      });
      if (existing) {
        return this.tasksService.findByRouteIdForUser(existing.displayId, user);
      }
    }

    const taskData = await buildTaskCreateDataFromQuote(this.prisma, quote);
    const task = await this.tasksService.createFromQuoteData(
      taskData,
      user,
      quote,
    );

    await this.prisma.quote.update({
      where: { id },
      data: { linkedTaskDisplayId: task.displayId },
    });

    return task;
  }

  async remove(id: string) {
    await this.getQuoteOrThrow(id);
    return this.prisma.quote.delete({ where: { id } });
  }

  private mergeQuoteForSync(
    quote: Quote,
    dto: UpdateQuoteDto,
  ): QuoteSyncInput {
    return {
      clientId: dto.clientId,
      clientName: dto.clientName ?? quote.clientName,
      clientPhoneCountryCode:
        dto.clientPhoneCountryCode ?? quote.clientPhoneCountryCode,
      clientPhoneNationalNumber:
        dto.clientPhoneNationalNumber ?? quote.clientPhoneNationalNumber,
      clientEmail: dto.clientEmail ?? quote.clientEmail,
      clientPreferredLanguage:
        dto.clientPreferredLanguage ?? quote.clientPreferredLanguage,
      plate: dto.plate ?? quote.plate,
      plateCountry: dto.plateCountry ?? quote.plateCountry,
      brand: dto.brand ?? quote.brand,
      model: dto.model ?? quote.model,
      year: dto.year ?? quote.year,
      color: dto.color ?? quote.color,
    };
  }

  private toSyncInput(dto: CreateQuoteDto): QuoteSyncInput {
    return {
      clientId: dto.clientId,
      clientName: dto.clientName,
      clientPhoneCountryCode: dto.clientPhoneCountryCode,
      clientPhoneNationalNumber: dto.clientPhoneNationalNumber,
      clientEmail: dto.clientEmail,
      clientPreferredLanguage: dto.clientPreferredLanguage,
      plate: dto.plate,
      plateCountry: dto.plateCountry,
      brand: dto.brand,
      model: dto.model,
      year: dto.year,
      color: dto.color,
    };
  }

  private async resolveQuoteLanguage(
    dtoLang: string | undefined,
    clientId: string,
  ): Promise<ClientPreferredLanguage> {
    if (dtoLang) return normalizePreferredLanguage(dtoLang);
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    return normalizePreferredLanguage(client?.preferredLanguage);
  }

  private scopeForUser(user: AuthUser) {
    if (user.role === Role.TECHNICIAN) {
      return { createdById: user.id };
    }
    return {};
  }

  private async getQuoteOrThrow(id: string): Promise<Quote> {
    const quote = await this.prisma.quote.findUnique({ where: { id } });
    if (!quote) throw new NotFoundException('Orçamento não encontrado');
    return quote;
  }

  private assertCanAccess(quote: Quote, user: AuthUser) {
    if (user.role !== Role.TECHNICIAN) return;
    if (quote.createdById !== user.id) {
      throw new ForbiddenException('Sem permissão para aceder a este orçamento');
    }
  }

  private async assertTechnicianServicesAllowed(
    user: AuthUser,
    services?: unknown,
  ) {
    if (user.role !== Role.TECHNICIAN) return;

    const codes = asServiceCodes(services).map((code) => code.trim().toLowerCase());
    const allowed = await this.catalogService.getTechnicianServiceCodes(user.id);
    const allowedSet = new Set(allowed);

    if (codes.length && !allowedSet.size) {
      throw new BadRequestException(
        'Nenhum serviço atribuído ao seu perfil',
      );
    }

    for (const code of codes) {
      if (!allowedSet.has(code)) {
        throw new BadRequestException(
          `Serviço não autorizado para este técnico: ${code}`,
        );
      }
    }
  }

  private async buildCatalogFields(
    dto: {
      services?: unknown;
      vehicleSize?: string | null;
      discount?: number;
      total?: number;
      totalOverride?: number;
    },
    existing?: Quote,
  ): Promise<{ services?: string[]; serviceSnapshots?: Prisma.InputJsonValue; total?: number }> {
    const shouldRebuild = !existing
      || (existing.status === QuoteStatus.DRAFT
        && (dto.services !== undefined || dto.vehicleSize !== undefined));

    if (!shouldRebuild) {
      return {};
    }

    const servicesRaw = dto.services !== undefined ? dto.services : existing?.services;
    const codes = asServiceCodes(servicesRaw);
    if (!codes.length) {
      return { services: [], serviceSnapshots: [] };
    }

    const vehicleSize = dto.vehicleSize !== undefined
      ? dto.vehicleSize
      : existing?.vehicleSize;
    const snapshots = await this.catalogService.buildSnapshots(codes, vehicleSize);
    const discount = dto.discount ?? existing?.discount ?? 0;
    const computedTotal = this.catalogService.computeTotalFromSnapshots(
      snapshots,
      discount,
    );
    const total = dto.totalOverride != null && !Number.isNaN(Number(dto.totalOverride))
      ? Number(dto.totalOverride)
      : computedTotal;

    return {
      services: codes,
      serviceSnapshots: snapshots as Prisma.InputJsonValue,
      total,
    };
  }
}
