import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ChecklistsModule } from './checklists/checklists.module';
import { NotificationsModule } from './notifications/notifications.module';
import { QuotesModule } from './quotes/quotes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ClientsModule,
    VehiclesModule,
    AppointmentsModule,
    ChecklistsModule,
    NotificationsModule,
    QuotesModule,
  ],
})
export class AppModule {}