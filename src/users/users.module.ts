import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { AdminsController } from './admins.controller';
import { AdminsService } from './admins.service';
import { TechniciansController } from './technicians.controller';
import { TechniciansService } from './technicians.service';
import { UsersMeController } from './users-me.controller';
import { UsersMeService } from './users-me.service';

@Module({
  imports: [AuthModule, CatalogModule],
  controllers: [UsersMeController, TechniciansController, AdminsController],
  providers: [TechniciansService, UsersMeService, AdminsService],
  exports: [TechniciansService],
})
export class UsersModule {}
