import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChecklistItemDto {
  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;
}

export class CreateChecklistDto {
  @IsString()
  appointmentId: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChecklistItemDto)
  @IsOptional()
  items?: CreateChecklistItemDto[];
}