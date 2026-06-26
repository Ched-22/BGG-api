import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { TechniciansController } from './technicians.controller';
import { TechniciansService } from './technicians.service';
import { UsersMeController } from './users-me.controller';
import { UsersMeService } from './users-me.service';

@Module({
  imports: [AuthModule, CatalogModule],
  controllers: [UsersMeController, TechniciansController],
  providers: [TechniciansService, UsersMeService],
  exports: [TechniciansService],
})
export class UsersModule {}
