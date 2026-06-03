import { IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  phone: string;

  @IsString()
  message: string;
}