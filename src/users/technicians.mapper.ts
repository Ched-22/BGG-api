import { Appointment, ServiceCategory, Task, User, Vehicle } from '@prisma/client';
import {
  computeRating,
  computeUtilizationPercent,
} from './technician-metrics';
import {
  computeCoverageProfile,
  extractActiveServiceCategories,
} from './technician-coverage';

type CatalogServiceSummary = {
  id: string;
  code: string;
  name: string;
  serviceCategory: ServiceCategory;
  active: boolean;
};

type UserWithTechnicianServices = User & {
  technicianServices?: Array<{
    catalogService: CatalogServiceSummary;
  }>;
};

type UserWithAppointments = User & {
  appointments?: (Appointment & { vehicle: Vehicle })[];
};

export type TechnicianStats = {
  activeAppointmentsCount: number;
  completedCount: number;
  utilizationPercent: number;
  rating: number;
  hasScheduleConflict: boolean;
};

export function mapTechnicianListItem(
  user: UserWithTechnicianServices,
  stats: TechnicianStats,
) {
  const services = (user.technicianServices ?? []).map((row) => row.catalogService);
  const activeServices = services.filter((s) => s.active);
  const serviceIds = services.map((s) => s.id);
  const serviceCodes = services.map((s) => s.code);
  const serviceCategories = extractActiveServiceCategories(activeServices);
  const coverageProfile = computeCoverageProfile(serviceCategories);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phoneCountryCode: user.phoneCountryCode,
    phoneNationalNumber: user.phoneNationalNumber,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    startedAt: user.startedAt?.toISOString() ?? null,
    skills: user.skills,
    serviceIds,
    serviceCodes,
    services: services.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      serviceCategory: s.serviceCategory,
      active: s.active,
    })),
    serviceCategories,
    coverageProfile,
    available: user.available,
    scheduleLabel: user.scheduleLabel,
    workloadHours: user.workloadHours,
    activeAppointmentsCount: stats.activeAppointmentsCount,
    completedCount: stats.completedCount,
    utilizationPercent: stats.utilizationPercent,
    rating: stats.rating,
    hasScheduleConflict: stats.hasScheduleConflict,
  };
}

export function mapTechnicianDetail(
  user: UserWithAppointments,
  stats: TechnicianStats,
  assignedTasks: Task[] = [],
) {
  const base = mapTechnicianListItem(user, stats);
  return {
    ...base,
    appointments: (user.appointments ?? []).map((a) => ({
      id: a.id,
      scheduledAt: a.scheduledAt.toISOString(),
      status: a.status,
      notes: a.notes,
      source: 'appointment' as const,
      vehicle: {
        plate: a.vehicle.plate,
        brand: a.vehicle.brand,
        model: a.vehicle.model,
      },
    })),
    assignedTasks: assignedTasks.map((task) => ({
      id: task.displayId,
      displayId: task.displayId,
      projeto: task.projeto,
      cliente: task.cliente,
      servico: task.servico,
      status: task.status,
      dataAgendada: task.dataAgendada,
      horario: task.horario,
    })),
  };
}

export function buildStats(
  user: User,
  activeAppointmentsCount: number,
  completedCount: number,
  hasScheduleConflict: boolean,
  scheduledHoursToday = 0,
): TechnicianStats {
  return {
    activeAppointmentsCount,
    completedCount,
    utilizationPercent: computeUtilizationPercent(
      scheduledHoursToday,
      user.workloadHours,
    ),
    rating: computeRating(completedCount),
    hasScheduleConflict,
  };
}
