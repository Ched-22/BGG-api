import { Appointment, User, Vehicle } from '@prisma/client';
import {
  computeRating,
  computeUtilizationPercent,
} from './technician-metrics';

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
  user: User,
  stats: TechnicianStats,
) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    startedAt: user.startedAt?.toISOString() ?? null,
    skills: user.skills,
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
) {
  const base = mapTechnicianListItem(user, stats);
  return {
    ...base,
    appointments: (user.appointments ?? []).map((a) => ({
      id: a.id,
      scheduledAt: a.scheduledAt.toISOString(),
      status: a.status,
      notes: a.notes,
      vehicle: {
        plate: a.vehicle.plate,
        brand: a.vehicle.brand,
        model: a.vehicle.model,
      },
    })),
  };
}

export function buildStats(
  user: User,
  activeAppointmentsCount: number,
  completedCount: number,
  hasScheduleConflict: boolean,
): TechnicianStats {
  return {
    activeAppointmentsCount,
    completedCount,
    utilizationPercent: computeUtilizationPercent(user.workloadHours),
    rating: computeRating(completedCount),
    hasScheduleConflict,
  };
}
