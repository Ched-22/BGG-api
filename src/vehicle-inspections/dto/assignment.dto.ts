import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class AssignmentQueryDto {
  @ValidateIf((o) => !o.taskDisplayId)
  @IsString()
  appointmentId?: string;

  @ValidateIf((o) => !o.appointmentId)
  @IsString()
  taskDisplayId?: string;
}

export class AssignmentBodyDto extends AssignmentQueryDto {}
