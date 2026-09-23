import { IsInt, IsOptional, IsString, IsUUID, MaxLength, IsIn, Min } from 'class-validator';
import { CLIENT_PREFERRED_LANGUAGES } from '../../common/client-preferred-language';

export class CreateTaskDto {
  @IsString()
  @MaxLength(100)
  projeto: string;

  @IsOptional()
  @IsString()
  servico?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descricao?: string;

  @IsString()
  plate: string;

  @IsOptional()
  @IsString()
  plateCountry?: string;

  @IsString()
  brand: string;

  @IsString()
  model: string;

  @IsInt()
  @Min(1900)
  year: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  anotInternas?: string;

  @IsString()
  @MaxLength(100)
  cliente: string;

  @IsOptional()
  @IsString()
  clienteEmail?: string;

  @IsOptional()
  @IsString()
  clienteTelCountryCode?: string;

  @IsOptional()
  @IsString()
  clienteTelNationalNumber?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

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
  @MaxLength(1000)
  anotPropriedade?: string;

  @IsOptional()
  @IsString()
  dataAgendada?: string;

  @IsOptional()
  @IsString()
  horario?: string;

  @IsOptional()
  @IsIn([...CLIENT_PREFERRED_LANGUAGES])
  clientePreferredLanguage?: string;
}
