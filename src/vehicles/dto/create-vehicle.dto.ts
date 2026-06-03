import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  plate: string;

  @IsString()
  brand: string;

  @IsString()
  model: string;

  @IsInt()
  year: number;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  clientId: string;
}