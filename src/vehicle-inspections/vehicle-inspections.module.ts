import { Module } from '@nestjs/common';
import { InAppNotificationsModule } from '../in-app-notifications/in-app-notifications.module';
import { VehicleInspectionsController } from './vehicle-inspections.controller';
import { VehicleInspectionsService } from './vehicle-inspections.service';

@Module({
  imports: [InAppNotificationsModule],
  controllers: [VehicleInspectionsController],
  providers: [VehicleInspectionsService],
  exports: [VehicleInspectionsService],
})
export class VehicleInspectionsModule {}
