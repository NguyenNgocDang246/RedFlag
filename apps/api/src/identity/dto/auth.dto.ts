import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { SUPPORTED_LOCALES } from '@phishgym/shared';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự / Password must be at least 8 characters' })
  password!: string;

  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class VerifyEmailDto {
  @IsString()
  token!: string;
}
