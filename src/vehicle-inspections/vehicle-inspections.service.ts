import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  InspectionReportStatus,
  Prisma,
  Role,
  VehicleInspection,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AssignmentQueryDto } from './dto/assignment.dto';
import { validateItemKeys } from './dto/inspection-phase.dto';
import { UpsertInspectionDto } from './dto/upsert-inspection.dto';
import {
  EMPTY_PHASE,
  InspectionPhase,
  parsePhase,
  phaseHasContent,
} from './inspection.types';
import {
  countEntryItems,
  countEntryPhotos,
  findDiffKeys,
  mapInspectionToDto,
  mergePhase,
} from './vehicle-inspections.mapper';
import { InAppNotificationsService } from '../in-app-notifications/in-app-notifications.service';

type JwtUser = { id: string; email: string; role: Role; name?: string };

@Injectable()
export class VehicleInspectionsService {
  constructor(
    private prisma: PrismaService,
    private inAppNotifications: InAppNotificationsService,
  ) {}

  async findByAssignment(query: AssignmentQueryDto, user: JwtUser) {
    const assignment = this.resolveAssignment(query);
    await this.assertOwnership(assignment, user);

    const row = await this.findRow(assignment);
    return mapInspectionToDto(row, assignment);
  }

  async getReport(query: AssignmentQueryDto, user: JwtUser) {
    const dto = await this.findByAssignment(query, user);
    const entry = dto.entry as InspectionPhase;
    const exit = dto.exit as InspectionPhase;
    const diffItemKeys = findDiffKeys(entry, exit);
    const vehicle = await this.resolveVehicleInfo(assignmentFromDto(dto), user);

    return {
      vehicle,
      entryItemCount: countEntryItems(entry),
      totalPhotoCount: countEntryPhotos(entry),
      diffCount: diffItemKeys.length,
      diffItemKeys,
    };
  }

  async upsert(dto: UpsertInspectionDto, user: JwtUser) {
    const assignment = this.resolveAssignment(dto);
    await this.assertOwnership(assignment, user);

    if (dto.entry) validateItemKeys(dto.entry.items);
    if (dto.exit) validateItemKeys(dto.exit.items);

    const entryPatch = dto.entry as InspectionPhase | undefined;
    let exitPatch = dto.exit as InspectionPhase | undefined;

    let row = await this.findRow(assignment);

    if (!row) {
      row = await this.prisma.vehicleInspection.create({
        data: {
          appointmentId: assignment.appointmentId ?? null,
          taskDisplayId: assignment.taskDisplayId ?? null,
          entryData: entryPatch && phaseHasContent(entryPatch)
            ? (mergePhase(EMPTY_PHASE, entryPatch) as unknown as Prisma.InputJsonValue)
            : {},
          exitData: exitPatch && phaseHasContent(exitPatch)
            ? (mergePhase(EMPTY_PHASE, exitPatch) as unknown as Prisma.InputJsonValue)
            : {},
        },
      });
      return mapInspectionToDto(row, assignment);
    }

    if (row.exitFinalizedAt) {
      throw new ConflictException('Inspeção já finalizada');
    }

    const currentEntry = parsePhase(row.entryData);
    const currentExit = parsePhase(row.exitData);

    if (entryPatch && row.entryFinalizedAt) {
      throw new ConflictException('Entrada já finalizada');
    }

    if (exitPatch && !phaseHasContent(exitPatch)) {
      exitPatch = undefined;
    }

    if (exitPatch && !row.entryFinalizedAt) {
      throw new BadRequestException('Finalize a entrada antes de editar a saída');
    }

    const nextEntry = entryPatch
      ? mergePhase(currentEntry, entryPatch)
      : currentEntry;
    const nextExit = exitPatch
      ? mergePhase(currentExit, exitPatch)
      : currentExit;

    row = await this.prisma.vehicleInspection.update({
      where: { id: row.id },
      data: {
        entryData: nextEntry as unknown as Prisma.InputJsonValue,
        exitData: nextExit as unknown as Prisma.InputJsonValue,
      },
    });

    return mapInspectionToDto(row, assignment);
  }

  async finalizeEntry(dto: AssignmentQueryDto, user: JwtUser) {
    const assignment = this.resolveAssignment(dto);
    await this.assertOwnership(assignment, user);

    let row = await this.findRow(assignment);
    if (!row) {
      throw new BadRequestException('Nenhum checklist de entrada para finalizar');
    }
    if (row.entryFinalizedAt) {
      throw new ConflictException('Entrada já finalizada');
    }

    const entry = parsePhase(row.entryData);
    const checked = entry.items.filter((item) => item.status);
    if (checked.length === 0) {
      throw new BadRequestException('Pelo menos um item deve ser verificado');
    }
    if (entry.generalPhotoUrls.length === 0) {
      throw new BadRequestException('É obrigatório adicionar pelo menos uma foto geral');
    }

    row = await this.prisma.vehicleInspection.update({
      where: { id: row.id },
      data: { entryFinalizedAt: new Date() },
    });

    await this.syncProgress(assignment, 'entry_done', user);

    return mapInspectionToDto(row, assignment);
  }

  async finalizeExit(dto: AssignmentQueryDto, user: JwtUser) {
    const assignment = this.resolveAssignment(dto);
    await this.assertOwnership(assignment, user);

    const row = await this.findRow(assignment);
    if (!row?.entryFinalizedAt) {
      throw new BadRequestException('Finalize a entrada antes da saída');
    }
    if (row.exitFinalizedAt) {
      throw new ConflictException('Saída já finalizada');
    }

    const entry = parsePhase(row.entryData);
    const exit = parsePhase(row.exitData);

    const entryKeys = new Set(
      entry.items.filter((item) => item.status).map((item) => item.itemKey),
    );
    const exitByKey = new Map(exit.items.map((item) => [item.itemKey, item]));

    for (const key of entryKeys) {
      if (!exitByKey.get(key)?.status) {
        throw new BadRequestException('Todos os itens devem ter um status na saída');
      }
    }

    const diffs = findDiffKeys(entry, exit);
    for (const key of diffs) {
      const exitItem = exitByKey.get(key);
      if (!exitItem?.note?.trim() || (exitItem.photoUrls?.length ?? 0) === 0) {
        throw new BadRequestException('Novo dano requer foto e observação');
      }
    }

    const updated = await this.prisma.vehicleInspection.update({
      where: { id: row.id },
      data: { exitFinalizedAt: new Date() },
    });

    await this.syncProgress(assignment, 'exit_done', user);

    return mapInspectionToDto(updated, assignment);
  }

  async submitForReview(dto: AssignmentQueryDto, user: JwtUser) {
    const assignment = this.resolveAssignment(dto);
    await this.assertOwnership(assignment, user);

    const row = await this.findRow(assignment);
    if (!row?.exitFinalizedAt) {
      throw new BadRequestException('Finalize a saída antes de enviar para revisão');
    }
    if (row.reportStatus === InspectionReportStatus.PENDING_REVIEW) {
      throw new ConflictException('Relatório já enviado para revisão');
    }
    if (row.reportStatus === InspectionReportStatus.SENT_TO_CLIENT) {
      throw new ConflictException('Relatório já enviado ao cliente');
    }

    const updated = await this.prisma.vehicleInspection.update({
      where: { id: row.id },
      data: {
        reportStatus: InspectionReportStatus.PENDING_REVIEW,
        submittedForReviewAt: new Date(),
      },
    });

    await this.syncTaskReviewStatus(assignment, 'pending_review', row);

    if (assignment.taskDisplayId) {
      const task = await this.prisma.task.findUnique({
        where: { displayId: assignment.taskDisplayId },
        select: { displayId: true, projeto: true, cliente: true },
      });
      if (task) {
        await this.inAppNotifications.notifyQaPendingReview(task);
      }
    }

    return mapInspectionToDto(updated, assignment);
  }

  async getAdminDetailByAssignment(query: AssignmentQueryDto, user: JwtUser) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Acesso negado');
    }
    const assignment = this.resolveAssignment(query);
    const row = await this.findRow(assignment);
    if (!row) {
      throw new NotFoundException('Inspeção não encontrada');
    }
    return this.getAdminDetail(row.id, user);
  }

  async getAdminDetail(id: string, _user: JwtUser) {
    const row = await this.prisma.vehicleInspection.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Inspeção não encontrada');

    const assignment = {
      appointmentId: row.appointmentId ?? undefined,
      taskDisplayId: row.taskDisplayId ?? undefined,
    };
    const dto = mapInspectionToDto(row, assignment);
    const entry = dto.entry as InspectionPhase;
    const exit = dto.exit as InspectionPhase;
    const diffItemKeys = findDiffKeys(entry, exit);
    const vehicleInfo = await this.resolveVehicleInfo(assignment, _user);
    const clientContact = await this.resolveClientContact(assignment);

    return {
      ...dto,
      vehicle: vehicleInfo,
      clientContact,
      entryItemCount: countEntryItems(entry),
      totalPhotoCount: countEntryPhotos(entry) + countEntryPhotos(exit),
      diffCount: diffItemKeys.length,
      diffItemKeys,
    };
  }

  private resolveAssignment(query: AssignmentQueryDto) {
    const appointmentId = query.appointmentId?.trim();
    const taskDisplayId = query.taskDisplayId?.trim();
    if (!appointmentId && !taskDisplayId) {
      throw new BadRequestException('Informe appointmentId ou taskDisplayId');
    }
    if (appointmentId && taskDisplayId) {
      throw new BadRequestException('Informe apenas appointmentId ou taskDisplayId');
    }
    return { appointmentId, taskDisplayId };
  }

  private async findRow(assignment: {
    appointmentId?: string;
    taskDisplayId?: string;
  }): Promise<VehicleInspection | null> {
    if (assignment.appointmentId) {
      return this.prisma.vehicleInspection.findUnique({
        where: { appointmentId: assignment.appointmentId },
      });
    }
    return this.prisma.vehicleInspection.findUnique({
      where: { taskDisplayId: assignment.taskDisplayId! },
    });
  }

  private async assertOwnership(
    assignment: { appointmentId?: string; taskDisplayId?: string },
    user: JwtUser,
  ) {
    if (user.role === Role.ADMIN) return;

    if (assignment.appointmentId) {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: assignment.appointmentId },
      });
      if (!appointment) throw new NotFoundException('Agendamento não encontrado');
      if (appointment.userId !== user.id) {
        throw new ForbiddenException('Acesso negado');
      }
      return;
    }

    const task = await this.prisma.task.findUnique({
      where: { displayId: assignment.taskDisplayId! },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    const technicianName = (user.name || '').trim();
    if (
      !task.tecnico
      || task.tecnico.trim().toLowerCase() !== technicianName.toLowerCase()
    ) {
      throw new ForbiddenException('Acesso negado');
    }
  }

  private async syncProgress(
    assignment: { appointmentId?: string; taskDisplayId?: string },
    phase: 'entry_done' | 'exit_done',
    _user: JwtUser,
  ) {
    if (assignment.appointmentId) {
      const status =
        phase === 'exit_done'
          ? AppointmentStatus.COMPLETED
          : AppointmentStatus.IN_PROGRESS;
      await this.prisma.appointment.update({
        where: { id: assignment.appointmentId },
        data: { status },
      });
      return;
    }

    const qaStatus = phase === 'exit_done' ? 'Checklist finalizado' : 'Em andamento';
    const task = await this.prisma.task.findUnique({
      where: { displayId: assignment.taskDisplayId! },
    });
    if (!task) return;

    const existingQa =
      task.qa && typeof task.qa === 'object' && !Array.isArray(task.qa)
        ? (task.qa as Record<string, unknown>)
        : {};

    await this.prisma.task.update({
      where: { displayId: assignment.taskDisplayId! },
      data: {
        qa: { ...existingQa, status: qaStatus } as Prisma.InputJsonValue,
      },
    });
  }

  private collectPhasePhotoUrls(phase: InspectionPhase): string[] {
    const urls = [...phase.generalPhotoUrls];
    for (const item of phase.items) {
      urls.push(...item.photoUrls);
    }
    return [...new Set(urls.filter((url) => typeof url === 'string' && url.trim()))];
  }

  private formatQaDateTime(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private async syncTaskReviewStatus(
    assignment: { appointmentId?: string; taskDisplayId?: string },
    phase: 'pending_review' | 'sent_to_client',
    inspection?: VehicleInspection | null,
  ) {
    if (!assignment.taskDisplayId) return;

    const task = await this.prisma.task.findUnique({
      where: { displayId: assignment.taskDisplayId },
    });
    if (!task) return;

    const existingQa =
      task.qa && typeof task.qa === 'object' && !Array.isArray(task.qa)
        ? (task.qa as Record<string, unknown>)
        : {};

    const concluidoEm = this.formatQaDateTime(new Date());
    const exitPhase = inspection ? parsePhase(inspection.exitData) : EMPTY_PHASE;
    const completionPhotos = this.collectPhasePhotoUrls(exitPhase);
    const exitNotes = exitPhase.notes.trim();

    if (phase === 'pending_review') {
      await this.prisma.task.update({
        where: { displayId: assignment.taskDisplayId },
        data: {
          status: 'Pronto para QA',
          ...(exitNotes ? { tecnicoNotas: exitNotes } : {}),
          qa: {
            ...existingQa,
            status: 'Pronto para Revisão',
            concluidoEm,
            fotos: completionPhotos,
          } as Prisma.InputJsonValue,
        },
      });
      return;
    }

    await this.prisma.task.update({
      where: { displayId: assignment.taskDisplayId },
      data: {
        status: 'Concluído',
        qa: {
          ...existingQa,
          status: 'Enviado ao cliente',
          concluidoEm: (existingQa.concluidoEm as string) || concluidoEm,
        } as Prisma.InputJsonValue,
      },
    });
  }

  private async resolveVehicleInfo(
    assignment: { appointmentId?: string; taskDisplayId?: string },
    _user: JwtUser,
  ) {
    if (assignment.appointmentId) {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: assignment.appointmentId },
        include: { vehicle: { include: { client: true } } },
      });
      if (!appointment) return { plate: '—', brand: '—', model: '—', clientName: '—' };
      return {
        plate: appointment.vehicle.plate,
        brand: appointment.vehicle.brand,
        model: appointment.vehicle.model,
        clientName: appointment.vehicle.client?.name ?? '—',
      };
    }

    const task = await this.prisma.task.findUnique({
      where: { displayId: assignment.taskDisplayId! },
    });
    if (!task) return { plate: '—', brand: '—', model: '—', clientName: '—' };

    const parts = String(task.projeto || '').split('·').map((p) => p.trim()).filter(Boolean);
    const plate = parts.length >= 2 ? parts[parts.length - 1] : '—';
    const car = parts.length >= 2 ? parts.slice(0, -1).join(' · ') : task.projeto || '—';
    const brandModel = car.split(' ').filter(Boolean);
    return {
      plate,
      brand: brandModel[0] ?? '—',
      model: brandModel.slice(1).join(' ') || '—',
      clientName: task.cliente || '—',
    };
  }

  private async resolveClientContact(
    assignment: { appointmentId?: string; taskDisplayId?: string },
  ) {
    if (assignment.appointmentId) {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: assignment.appointmentId },
        include: { vehicle: { include: { client: true } } },
      });
      const client = appointment?.vehicle?.client;
      if (!client) return { name: '—', phoneCountryCode: null, phoneNationalNumber: null };
      return {
        name: client.name,
        phoneCountryCode: client.phoneCountryCode,
        phoneNationalNumber: client.phoneNationalNumber,
      };
    }

    const task = await this.prisma.task.findUnique({
      where: { displayId: assignment.taskDisplayId! },
    });
    if (!task) return { name: '—', phoneCountryCode: null, phoneNationalNumber: null };

    return {
      name: task.cliente || '—',
      phoneCountryCode: task.clienteTelCountryCode ?? null,
      phoneNationalNumber: task.clienteTelNationalNumber ?? null,
    };
  }
}

function assignmentFromDto(dto: {
  appointmentId: string | null;
  taskDisplayId: string | null;
}) {
  return {
    appointmentId: dto.appointmentId ?? undefined,
    taskDisplayId: dto.taskDisplayId ?? undefined,
  };
}
