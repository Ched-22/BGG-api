import { Client, Vehicle } from '@prisma/client';
import { formatPlateDisplay, resolvePlateCountry } from '../common/plate-utils';

type VehicleWithClient = Vehicle & { client: Client };

export function mapVehicleListItem(vehicle: VehicleWithClient) {
  return {
    id: vehicle.id,
    plate: vehicle.plate,
    plateCountry: vehicle.plateCountry,
    plateDisplay: formatPlateDisplay(vehicle.plate, vehicle.plateCountry),
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color,
    clientId: vehicle.clientId,
    clientName: vehicle.client.name,
    clientPhoneCountryCode: vehicle.client.phoneCountryCode,
    clientPhoneNationalNumber: vehicle.client.phoneNationalNumber,
  };
}

export function mapVehicleForClient(vehicle: Vehicle) {
  return {
    id: vehicle.id,
    plate: vehicle.plate,
    plateCountry: vehicle.plateCountry,
    plateDisplay: formatPlateDisplay(vehicle.plate, vehicle.plateCountry),
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color,
  };
}
