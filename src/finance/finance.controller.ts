import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpsertEmployeeCostDto } from './dto/employee-cost.dto';
import { CreateFinanceExpenseDto, UpdateFinanceExpenseDto } from './dto/finance-expense.dto';
import { FinanceSummaryQueryDto } from './dto/finance-summary-query.dto';
import { FinanceService } from './finance.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('finance')
export class FinanceController {
  constructor(private financeService: FinanceService) {}

  @Get('summary')
  getSummary(@Query() dto: FinanceSummaryQueryDto) {
    return this.financeService.getSummary(dto);
  }

  @Get('expenses')
  listExpenses() {
    return this.financeService.listExpenses();
  }

  @Post('expenses')
  createExpense(@Body() dto: CreateFinanceExpenseDto) {
    return this.financeService.createExpense(dto);
  }

  @Patch('expenses/:id')
  updateExpense(@Param('id') id: string, @Body() dto: UpdateFinanceExpenseDto) {
    return this.financeService.updateExpense(id, dto);
  }

  @Delete('expenses/:id')
  deleteExpense(@Param('id') id: string) {
    return this.financeService.deleteExpense(id);
  }

  @Get('employee-costs')
  listEmployeeCosts() {
    return this.financeService.listEmployeeCosts();
  }

  @Put('employee-costs/:userId')
  upsertEmployeeCost(
    @Param('userId') userId: string,
    @Body() dto: UpsertEmployeeCostDto,
  ) {
    return this.financeService.upsertEmployeeCost(userId, dto);
  }
}
