import { IsEmail, IsIn, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsIn(['admin', 'mobile'])
  client: 'admin' | 'mobile';
}
