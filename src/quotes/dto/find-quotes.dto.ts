import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class FindQuotesDto {
  @IsOptional()
  @Transform(({ value }) => (value != null && value !== '' ? Number(value) : 1))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => (value != null && value !== '' ? Number(value) : 15))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 15;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  service?: string;
}
