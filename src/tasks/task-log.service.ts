import { Injectable } from '@nestjs/common';
import { Prisma, Quote } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  TaskLogActor,
  TaskLogEntry,
  buildLogEntry,
} from './task-log';

@Injectable()
export class TaskLogService {
  constructor(private prisma: PrismaService) {}

  asLog(value: unknown): TaskLogEntry[] {
    return Array.isArray(value) ? (value as TaskLogEntry[]) : [];
  }

  appendToLogArray(
    currentLog: unknown,
    entry: TaskLogEntry,
  ): Prisma.InputJsonValue[] {
    return [
      ...this.asLog(currentLog),
      entry,
    ] as unknown as Prisma.InputJsonValue[];
  }

  buildEntry(
    action: string,
    actor: TaskLogActor,
    meta?: Record<string, unknown>,
  ): TaskLogEntry {
    return buildLogEntry(action, actor, meta);
  }

  private createEntry(
    action: string,
    actor: TaskLogActor,
    meta?: Record<string, unknown>,
    at?: string | Date,
  ): TaskLogEntry {
    return buildLogEntry(action, actor, meta, at ? { at } : undefined);
  }

  async appendByDisplayId(
    displayId: string,
    action: string,
    actor: TaskLogActor,
    meta?: Record<string, unknown>,
    at?: string | Date,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { displayId },
    });
    if (!task) return null;

    const entry = this.createEntry(action, actor, meta, at);
    return this.prisma.task.update({
      where: { id: task.id },
      data: {
        log: this.appendToLogArray(task.log, entry),
      },
    });
  }

  async appendEntryToQuote(quoteId: string, entry: TaskLogEntry) {
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) return null;

    return this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        activityLog: this.appendToLogArray(quote.activityLog, entry),
      },
    });
  }

  async appendEntryToTaskByDisplayId(displayId: string, entry: TaskLogEntry) {
    const task = await this.prisma.task.findFirst({
      where: { displayId },
    });
    if (!task) return null;

    return this.prisma.task.update({
      where: { id: task.id },
      data: {
        log: this.appendToLogArray(task.log, entry),
      },
    });
  }

  async appendForQuote(
    quote: Quote,
    action: string,
    actor: TaskLogActor,
    meta?: Record<string, unknown>,
    at?: string | Date,
  ) {
    const entry = this.createEntry(action, actor, { ...meta, quoteId: quote.id }, at);

    await this.appendEntryToQuote(quote.id, entry);

    const displayId = await this.resolveLinkedTaskDisplayId(quote);
    if (displayId) {
      await this.appendEntryToTaskByDisplayId(displayId, entry);
    }

    return entry;
  }

  async resolveLinkedTaskDisplayId(quote: Quote): Promise<string | null> {
    if (quote.linkedTaskDisplayId) {
      return quote.linkedTaskDisplayId;
    }

    const tasks = await this.prisma.task.findMany({
      where: { cliente: quote.clientName },
      select: { displayId: true, projeto: true },
    });

    if (tasks.length !== 1) return null;

    const plate = quote.plate?.trim().toLowerCase();
    if (plate) {
      const projeto = tasks[0].projeto?.toLowerCase() || '';
      if (!projeto.includes(plate)) return null;
    }

    return tasks[0].displayId;
  }
}
