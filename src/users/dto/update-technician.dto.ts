import { PartialType } from '@nestjs/mapped-types';
import { CreateTechnicianDto } from './create-technician.dto';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTechnicianDto extends PartialType(CreateTechnicianDto) {
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
