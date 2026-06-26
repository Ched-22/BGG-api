import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { CLIENT_PREFERRED_LANGUAGES } from '../../common/client-preferred-language';

export const CLIENT_STATUSES = ['Ativo', 'Inativo', 'VIP'] as const;

export class CreateClientDto {
  @IsString()
  name: string;

  @IsString()
  phoneCountryCode: string;

  @IsString()
  phoneNationalNumber: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsOptional()
  @IsIn([...CLIENT_PREFERRED_LANGUAGES])
  preferredLanguage?: string;

  @IsOptional()
  @IsIn(CLIENT_STATUSES)
  status?: string;

  @IsOptional()
  @IsString()
  addressUnit?: string;

  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}