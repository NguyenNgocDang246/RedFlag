import { ArrayMaxSize, IsArray, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { SUPPORTED_LOCALES } from '@redflag/shared';

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

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự / Password must be at least 8 characters' })
  newPassword!: string;
}

/** Personal info — every field optional (R9); an empty string clears it. */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  occupation?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  servicesUsed?: string[];

  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: string;
}
