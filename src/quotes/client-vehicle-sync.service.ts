import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePlate, validatePlate, plateValidationMessage, resolvePlateCountry } from '../common/plate-utils';
import { normalizePreferredLanguage } from '../common/client-preferred-language';

export type QuoteSyncInput = {
  clientId?: string | null;
  clientName: string;
  clientPhoneCountryCode: string;
  clientPhoneNationalNumber: string;
  clientEmail?: string | null;
  clientPreferredLanguage?: string | null;
  plate: string;
  plateCountry?: string | null;
  brand: string;
  model: string;
  year: number;
  color?: string | null;
};

export type QuoteSyncResult = {
  syncedClientId: string;
  syncedVehicleId: string;
};

@Injectable()
export class ClientVehicleSyncService {
  constructor(private prisma: PrismaService) {}

  private normalizeName(name?: string | null): string {
    return String(name || '').trim().toLowerCase();
  }

  private samePhone(
    a: { phoneCountryCode: string; phoneNationalNumber: string },
    b: { phoneCountryCode: string; phoneNationalNumber: string },
  ): boolean {
    return (
      String(a.phoneCountryCode).replace(/\D/g, '')
        === String(b.phoneCountryCode).replace(/\D/g, '')
      && String(a.phoneNationalNumber).replace(/\D/g, '')
        === String(b.phoneNationalNumber).replace(/\D/g, '')
    );
  }

  async syncForQuote(input: QuoteSyncInput): Promise<QuoteSyncResult> {
    const plateCountry = resolvePlateCountry(input.plateCountry);
    if (!validatePlate(input.plate, plateCountry)) {
      throw new BadRequestException(plateValidationMessage(plateCountry));
    }

    const year = Number(input.year);
    if (!Number.isFinite(year) || year < 1900 || year > 2100) {
      throw new BadRequestException('Ano do veículo inválido');
    }

    return this.prisma.$transaction(async (tx) => {
      const clientId = await this.resolveClientForQuote(tx, input);
      const vehicleId = await this.upsertVehicleForQuote(tx, clientId, input);
      return { syncedClientId: clientId, syncedVehicleId: vehicleId };
    });
  }

  private async resolveClientForQuote(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    input: QuoteSyncInput,
  ): Promise<string> {
    if (input.clientId) {
      const existing = await tx.client.findUnique({
        where: { id: input.clientId },
      });
      if (!existing) {
        throw new NotFoundException('Cliente não encontrado');
      }
      return existing.id;
    }

    const phoneCountryCode = String(input.clientPhoneCountryCode || '').replace(
      /\D/g,
      '',
    );
    const phoneNationalNumber = String(
      input.clientPhoneNationalNumber || '',
    ).replace(/\D/g, '');

    if (phoneCountryCode && phoneNationalNumber) {
      const matches = await tx.client.findMany({
        where: { phoneCountryCode, phoneNationalNumber },
        take: 2,
      });
      if (matches.length === 1) {
        return matches[0].id;
      }
      if (matches.length > 1) {
        const byName = matches.find(
          (row) => this.normalizeName(row.name) === this.normalizeName(input.clientName),
        );
        if (byName) return byName.id;
      }
    }

    const created = await tx.client.create({
      data: {
        name: input.clientName?.trim() || 'Cliente',
        phoneCountryCode: phoneCountryCode || '34',
        phoneNationalNumber: phoneNationalNumber || '0',
        email: input.clientEmail?.trim() || undefined,
        preferredLanguage: normalizePreferredLanguage(input.clientPreferredLanguage),
      },
    });
    return created.id;
  }

  private async upsertVehicleForQuote(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    clientId: string,
    input: QuoteSyncInput,
  ): Promise<string> {
    const plateCountry = resolvePlateCountry(input.plateCountry);
    const plate = normalizePlate(input.plate, plateCountry);
    const existing = await tx.vehicle.findUnique({ where: { plate } });

    const vehicleData = {
      brand: input.brand?.trim() || '',
      model: input.model?.trim() || '',
      year: Number(input.year),
      color: input.color?.trim() || undefined,
      plateCountry,
    };

    if (!existing) {
      const created = await tx.vehicle.create({
        data: { plate, clientId, ...vehicleData },
      });
      return created.id;
    }

    if (existing.clientId !== clientId) {
      const currentClient = await tx.client.findUnique({
        where: { id: existing.clientId },
      });
      const newClient = await tx.client.findUnique({
        where: { id: clientId },
      });
      if (
        currentClient
        && newClient
        && this.samePhone(currentClient, newClient)
      ) {
        const updated = await tx.vehicle.update({
          where: { id: existing.id },
          data: { clientId, ...vehicleData },
        });
        return updated.id;
      }
      throw new ConflictException(
        'Placa já cadastrada para outro cliente',
      );
    }

    const updated = await tx.vehicle.update({
      where: { id: existing.id },
      data: vehicleData,
    });
    return updated.id;
  }
}
