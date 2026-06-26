import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AssignmentBodyDto } from './assignment.dto';
import { InspectionPhaseDto } from './inspection-phase.dto';

export class UpsertInspectionDto extends AssignmentBodyDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => InspectionPhaseDto)
  entry?: InspectionPhaseDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => InspectionPhaseDto)
  exit?: InspectionPhaseDto;
}
