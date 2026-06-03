import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateChecklistItemDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  done?: boolean;

  @IsString()
  @IsOptional()
  photoUrl?: string;
}