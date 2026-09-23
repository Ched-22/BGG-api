import { Client, Prisma, Vehicle } from '@prisma/client';
import { buildEnderecoFromClient } from '../quotes/quote-task-mapper';

type ClientWithVehicles = Client & { vehicles: Vehicle[] };

type Tx = Prisma.TransactionClient;

export class ClientDenormalizedSyncService {
  async propagate(tx: Tx, before: ClientWithVehicles, after: Client) {
    const taskData = this.taskPatchFromClient(after);
    const quoteData = this.quotePatchFromClient(after);

    const taskWhere = this.buildTaskWhere(before);
    const quoteIds = await this.findLinkedQuoteIds(tx, before);

    const [tasksResult, quotesResult] = await Promise.all([
      tx.task.updateMany({ where: taskWhere, data: taskData }),
      quoteIds.length
        ? tx.quote.updateMany({ where: { id: { in: quoteIds } }, data: quoteData })
        : Promise.resolve({ count: 0 }),
    ]);

    return {
      tasksUpdated: tasksResult.count,
      quotesUpdated: quotesResult.count,
    };
  }

  private taskPatchFromClient(client: Client): Prisma.TaskUpdateManyMutationInput {
    return {
      cliente: client.name,
      clienteEmail: client.email?.trim() || null,
      clienteTelCountryCode: client.phoneCountryCode,
      clienteTelNationalNumber: client.phoneNationalNumber,
      clientePreferredLanguage: client.preferredLanguage,
      endereco: buildEnderecoFromClient(client),
    };
  }

  private quotePatchFromClient(client: Client): Prisma.QuoteUpdateManyMutationInput {
    return {
      clientName: client.name,
      clientPhoneCountryCode: client.phoneCountryCode,
      clientPhoneNationalNumber: client.phoneNationalNumber,
      clientEmail: client.email?.trim() || null,
      clientPreferredLanguage: client.preferredLanguage,
    };
  }

  private buildTaskWhere(before: ClientWithVehicles): Prisma.TaskWhereInput {
    return {
      OR: [
        { clientId: before.id },
        {
          AND: [
            { clienteTelCountryCode: before.phoneCountryCode },
            { clienteTelNationalNumber: before.phoneNationalNumber },
            { cliente: { equals: before.name, mode: 'insensitive' } },
          ],
        },
      ],
    };
  }

  private async findLinkedQuoteIds(
    tx: Tx,
    before: ClientWithVehicles,
  ): Promise<string[]> {
    const plates = before.vehicles
      .map((vehicle) => vehicle.plate?.trim())
      .filter(Boolean) as string[];

    const [byPlate, byIdentity] = await Promise.all([
      plates.length
        ? tx.quote.findMany({
          where: { plate: { in: plates } },
          select: { id: true },
        })
        : Promise.resolve([]),
      tx.quote.findMany({
        where: {
          clientPhoneCountryCode: before.phoneCountryCode,
          clientPhoneNationalNumber: before.phoneNationalNumber,
          clientName: { equals: before.name, mode: 'insensitive' },
        },
        select: { id: true },
      }),
    ]);

    return [...new Set([...byPlate, ...byIdentity].map((row) => row.id))];
  }
}
