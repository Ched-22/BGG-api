import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { TASK_LOG_ACTIONS } from '../task-log';

const LOG_ACTION_VALUES = Object.values(TASK_LOG_ACTIONS);

class TaskLogEntryDto {
  @IsString()
  @MaxLength(200)
  t: string;

  @IsString()
  @MaxLength(100)
  w: string;

  @IsString()
  @MaxLength(50)
  when: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tecnico?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tecnicoStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  tecnicoNotas?: string;

  @IsOptional()
  @IsString()
  dataAgendada?: string | null;

  @IsOptional()
  @IsString()
  horario?: string | null;

  @IsOptional()
  @IsString()
  clientDropoffDate?: string | null;

  @IsOptional()
  @IsString()
  clientDropoffTime?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99)
  baia?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  duracaoHoras?: number | null;

  @IsOptional()
  @IsIn(['es', 'ca', 'en', 'ptBr', 'ptPt'])
  clientePreferredLanguage?: string;

  @IsOptional()
  @IsObject()
  orcamento?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  qa?: Record<string, unknown>;

  @IsOptional()
  @ValidateNested()
  @Type(() => TaskLogEntryDto)
  logEntry?: TaskLogEntryDto;

  @IsOptional()
  @IsString()
  @IsIn(LOG_ACTION_VALUES)
  logAction?: string;

  @IsOptional()
  @IsObject()
  logMeta?: Record<string, unknown>;
}
