import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { InAppNotificationsModule } from '../in-app-notifications/in-app-notifications.module';
import { CatalogModule } from '../catalog/catalog.module';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { ClientVehicleSyncService } from './client-vehicle-sync.service';

@Module({
  imports: [TasksModule, InAppNotificationsModule, CatalogModule],
  controllers: [QuotesController],
  providers: [QuotesService, ClientVehicleSyncService],
  exports: [QuotesService],
})
export class QuotesModule {}
