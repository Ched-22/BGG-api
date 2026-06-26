import { IsOptional, IsString, MaxLength } from 'class-validator';

export class NotifyPickupDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  qaNotes?: string;
}
