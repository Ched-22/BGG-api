import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MaxLength(100)
  projeto: string;

  @IsString()
  servico: string;

  @IsString()
  @MaxLength(1000)
  descricao: string;

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
  clienteTel?: string;

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
}
