import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, TaskPayment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TaskLogService } from '../tasks/task-log.service';
import { TASK_LOG_ACTIONS, actorFromUser } from '../tasks/task-log';
import { UpsertTaskPaymentDto } from './dto/upsert-task-payment.dto';
import {
  derivePaymentStatus,
  isPaymentMethod,
  isSettlementStatus,
  isValidIban,
  normalizeIban,
  paymentMethodLabel,
  readOrcamentoAmounts,
  roundMoney,
  settlementStatusLabel,
} from './payment.util';

type AuthUser = {
  id: string;
  email: string;
  role: Role;
  name?: string;
};

@Injectable()
export class TaskPaymentService {
  constructor(
    private prisma: PrismaService,
    private taskLogService: TaskLogService,
  ) {}

  async getByDisplayId(displayId: string) {
    const task = await this.findTaskOrThrow(displayId);
    return this.mapResponse(task.displayId, task.orcamento, task.payment);
  }

  async upsertByDisplayId(
    displayId: string,
    dto: UpsertTaskPaymentDto,
    user: AuthUser,
  ) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem editar pagamentos');
    }

    const task = await this.findTaskOrThrow(displayId);
    const amounts = readOrcamentoAmounts(task.orcamento);
    this.validateDto(dto);

    const now = new Date();
    const isPaidLike = dto.settlementStatus === 'paid' || dto.settlementStatus === 'prepaid';
    const existing = task.payment;
    const paidAt = isPaidLike
      ? (existing?.paidAt && existing.settlementStatus === dto.settlementStatus
        ? existing.paidAt
        : now)
      : null;

    const data = {
      settlementStatus: dto.settlementStatus,
      paymentMethod: dto.settlementStatus === 'pending' ? null : dto.paymentMethod ?? null,
      iban: dto.iban ? normalizeIban(dto.iban) : null,
      amount: dto.settlementStatus === 'pending'
        ? roundMoney(dto.amount ?? amounts.saldo)
        : roundMoney(dto.amount ?? amounts.saldo),
      isInstallment: dto.settlementStatus === 'paid' ? Boolean(dto.isInstallment) : false,
      installmentCount: dto.settlementStatus === 'paid' && dto.isInstallment
        ? dto.installmentCount ?? null
        : null,
      installmentsPaid: dto.settlementStatus === 'paid' && dto.isInstallment
        ? dto.installmentsPaid ?? 0
        : 0,
      paidAt,
      notes: dto.notes?.trim() || null,
      updatedByUserId: user.id,
    };

    const payment = existing
      ? await this.prisma.taskPayment.update({
          where: { taskId: task.id },
          data,
        })
      : await this.prisma.taskPayment.create({
          data: { taskId: task.id, ...data },
        });

    await this.taskLogService.appendByDisplayId(
      displayId,
      TASK_LOG_ACTIONS.PAYMENT_UPDATED,
      actorFromUser(user),
      {
        settlementStatus: dto.settlementStatus,
        paymentMethod: dto.paymentMethod,
        paymentStatus: derivePaymentStatus(payment),
      },
    );

    return this.mapResponse(task.displayId, task.orcamento, payment);
  }

  private validateDto(dto: UpsertTaskPaymentDto) {
    if (!isSettlementStatus(dto.settlementStatus)) {
      throw new BadRequestException('settlementStatus inválido');
    }

    if (dto.settlementStatus === 'pending') {
      return;
    }

    if (!dto.paymentMethod || !isPaymentMethod(dto.paymentMethod)) {
      throw new BadRequestException('paymentMethod é obrigatório ao marcar pago');
    }

    if (
      (dto.paymentMethod === 'multibanco' || dto.paymentMethod === 'bankTransfer')
      && (!dto.iban || !isValidIban(dto.iban))
    ) {
      throw new BadRequestException('IBAN inválido ou em falta');
    }

    if (dto.amount != null && dto.amount < 0) {
      throw new BadRequestException('amount inválido');
    }

    if (dto.isInstallment) {
      if (!dto.installmentCount || dto.installmentCount < 2) {
        throw new BadRequestException('installmentCount deve ser ≥ 2');
      }
      const paid = dto.installmentsPaid ?? 0;
      if (paid < 0 || paid > dto.installmentCount) {
        throw new BadRequestException('installmentsPaid inválido');
      }
    }
  }

  private async findTaskOrThrow(displayId: string) {
    const task = await this.prisma.task.findFirst({
      where: { displayId },
      include: { payment: true },
    });
    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }
    return task;
  }

  private mapResponse(
    taskDisplayId: string,
    orcamento: unknown,
    payment: TaskPayment | null,
  ) {
    const amounts = readOrcamentoAmounts(orcamento as never);
    const settlementStatus = payment?.settlementStatus ?? 'pending';
    const shape = payment ?? {
      settlementStatus: 'pending',
      isInstallment: false,
      installmentCount: null,
      installmentsPaid: 0,
    };

    return {
      taskDisplayId,
      settlementStatus,
      paymentMethod: payment?.paymentMethod ?? null,
      iban: payment?.iban ?? null,
      amount: payment?.amount ?? amounts.saldo,
      isInstallment: payment?.isInstallment ?? false,
      installmentCount: payment?.installmentCount ?? null,
      installmentsPaid: payment?.installmentsPaid ?? 0,
      paymentStatus: derivePaymentStatus(shape),
      paidAt: payment?.paidAt?.toISOString() ?? null,
      notes: payment?.notes ?? null,
      updatedAt: payment?.updatedAt?.toISOString() ?? null,
      updatedByUserId: payment?.updatedByUserId ?? null,
      settlementStatusLabel: settlementStatusLabel(settlementStatus),
      paymentMethodLabel: paymentMethodLabel(payment?.paymentMethod),
    };
  }
}
