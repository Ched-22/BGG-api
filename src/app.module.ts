import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ChecklistsModule } from './checklists/checklists.module';
import { NotificationsModule } from './notifications/notifications.module';
import { QuotesModule } from './quotes/quotes.module';
import { UsersModule } from './users/users.module';
import { InventoryModule } from './inventory/inventory.module';
import { CatalogModule } from './catalog/catalog.module';
import { TasksModule } from './tasks/tasks.module';
import { VehicleInspectionsModule } from './vehicle-inspections/vehicle-inspections.module';
import { MediaModule } from './media/media.module';
import { InAppNotificationsModule } from './in-app-notifications/in-app-notifications.module';
import { MailModule } from './mail/mail.module';
import { WeeklyReportsModule } from './weekly-reports/weekly-reports.module';
import { FinanceModule } from './finance/finance.module';
import { TaskPaymentModule } from './task-payment/task-payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    VehiclesModule,
    AppointmentsModule,
    ChecklistsModule,
    NotificationsModule,
    InAppNotificationsModule,
    QuotesModule,
    InventoryModule,
    CatalogModule,
    TasksModule,
    VehicleInspectionsModule,
    MediaModule,
    WeeklyReportsModule,
    FinanceModule,
    TaskPaymentModule,
  ],
})
export class AppModule {}