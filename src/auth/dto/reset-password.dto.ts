import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export class ResetPasswordDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_PATTERN, {
    message:
      'A senha deve incluir letra maiúscula, minúscula, número e caractere especial',
  })
  password: string;
}
