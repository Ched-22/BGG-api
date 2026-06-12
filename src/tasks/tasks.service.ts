import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

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

  async findAll() {
    return this.prisma.task.findMany({
      orderBy: { createdAt: 'desc' },
    });
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

  private asObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private asLog(value: unknown): Prisma.InputJsonValue[] {
    return Array.isArray(value) ? (value as Prisma.InputJsonValue[]) : [];
  }

  async update(routeId: string, dto: UpdateTaskDto) {
    const current = await this.findByRouteId(routeId);
    const data: Prisma.TaskUpdateInput = {};

    if (dto.status !== undefined) data.status = dto.status;
    if (dto.tecnico !== undefined) data.tecnico = dto.tecnico;
    if (dto.tecnicoStatus !== undefined) data.tecnicoStatus = dto.tecnicoStatus;
    if (dto.tecnicoNotas !== undefined) data.tecnicoNotas = dto.tecnicoNotas;
    if (dto.dataAgendada !== undefined) data.dataAgendada = dto.dataAgendada;
    if (dto.horario !== undefined) data.horario = dto.horario;
    if (dto.baia !== undefined) data.baia = dto.baia;
    if (dto.duracaoHoras !== undefined) data.duracaoHoras = dto.duracaoHoras;

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

    if (dto.logEntry) {
      data.log = [...this.asLog(current.log), dto.logEntry] as Prisma.InputJsonValue;
    }

    return this.prisma.task.update({
      where: { id: current.id },
      data,
    });
  }

  async create(dto: CreateTaskDto) {
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
    };

    const qa = { status: '—', notas: '', fotos: [], concluidoEm: '' };
    const log = [{ t: 'Tarefa criada manualmente', w: 'Admin · Você', when: 'Agora' }];

    return this.prisma.task.create({
      data: {
        displayId,
        projeto: dto.projeto.trim(),
        cliente: dto.cliente.trim(),
        clienteEmail: dto.clienteEmail?.trim() || null,
        clienteTel: dto.clienteTel?.trim() || null,
        servico: dto.servico.trim(),
        status: scheduled ? 'Agendado' : 'Não agendado',
        descricao: dto.descricao.trim(),
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
        log,
        clientId: dto.clientId || null,
      },
    });
  }
}
