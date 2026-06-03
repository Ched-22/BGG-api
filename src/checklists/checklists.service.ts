import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist.dto';

@Injectable()
export class ChecklistsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateChecklistDto) {
    return this.prisma.checklist.create({
      data: {
        appointmentId: dto.appointmentId,
        notes: dto.notes,
        items: {
          create: dto.items || [],
        },
      },
      include: { items: true },
    });
  }

  async findOne(id: string) {
    const checklist = await this.prisma.checklist.findUnique({
      where: { id },
      include: { items: true, appointment: true },
    });
    if (!checklist) throw new NotFoundException('Checklist não encontrada');
    return checklist;
  }

  async findByAppointment(appointmentId: string) {
    const checklist = await this.prisma.checklist.findUnique({
      where: { appointmentId },
      include: { items: true },
    });
    if (!checklist) throw new NotFoundException('Checklist não encontrada');
    return checklist;
  }

  async updateItem(itemId: string, dto: UpdateChecklistItemDto) {
    return this.prisma.checklistItem.update({
      where: { id: itemId },
      data: dto,
    });
  }

  async addItem(checklistId: string, description: string, photoUrl?: string) {
    return this.prisma.checklistItem.create({
      data: { checklistId, description, photoUrl },
    });
  }

  async removeItem(itemId: string) {
    return this.prisma.checklistItem.delete({ where: { id: itemId } });
  }

  async complete(id: string) {
    return this.prisma.checklist.update({
      where: { id },
      data: { completedAt: new Date() },
      include: { items: true },
    });
  }
}