import { Appointment, User } from '@prisma/client';
import { buildStats, TechnicianStats } from './technicians.mapper';

function baseProfileFields(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phoneCountryCode: user.phoneCountryCode,
    phoneNationalNumber: user.phoneNationalNumber,
    active: user.active,
    createdAt: user.createdAt.toISOString(),
    hasPassword: user.password != null,
    hasGoogle: user.googleId != null,
  };
}

export function mapAdminProfile(user: User) {
  return baseProfileFields(user);
}

type AppointmentWithVehicle = Appointment & {
  vehicle: { plate: string; brand: string; model: string };
};

export function mapTechnicianProfile(
  user: User,
  stats: TechnicianStats,
  upcomingAppointments: AppointmentWithVehicle[],
) {
  return {
    ...baseProfileFields(user),
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
    upcomingAppointments: upcomingAppointments.map((a) => ({
      id: a.id,
      scheduledAt: a.scheduledAt.toISOString(),
      status: a.status,
      vehicle: {
        plate: a.vehicle.plate,
        brand: a.vehicle.brand,
        model: a.vehicle.model,
      },
    })),
  };
}

export { buildStats };
