import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class FindVehiclesDto {
  @IsOptional()
  @Transform(({ value }) => (value != null && value !== '' ? Number(value) : 1))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => (value != null && value !== '' ? Number(value) : 20))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  plate?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
