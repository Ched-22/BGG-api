import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InAppNotificationsModule } from '../in-app-notifications/in-app-notifications.module';
import { TasksController } from './tasks.controller';
import { TaskLogService } from './task-log.service';
import { TasksService } from './tasks.service';

@Module({
  imports: [AuthModule, InAppNotificationsModule],
  controllers: [TasksController],
  providers: [TasksService, TaskLogService],
  exports: [TasksService, TaskLogService],
})
export class TasksModule {}
