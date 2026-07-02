import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { FinanceRevenueService } from './finance-revenue.service';
import { TaskPaymentController } from './task-payment.controller';
import { TaskPaymentService } from './task-payment.service';

@Module({
  imports: [TasksModule],
  controllers: [TaskPaymentController],
  providers: [TaskPaymentService, FinanceRevenueService],
  exports: [TaskPaymentService, FinanceRevenueService],
})
export class TaskPaymentModule {}
