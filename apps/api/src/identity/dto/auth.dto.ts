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

/** Asking for a reset link. Answered the same way whether or not the address has an account. */
export class ForgotPasswordDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: string;
}

/** Setting a new password from a mailed link — the token stands in for the current password. */
export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự / Password must be at least 8 characters' })
  password!: string;
}

/** A new confirmation link for an address that never confirmed. Same silent answer as above. */
export class ResendVerificationDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: string;
}

export class ChangePasswordDto {
  // Optional: an account that only signs in with Google has no current password to check, and the
  // signed-in session is the proof instead.
  @IsOptional()
  @IsString()
  currentPassword?: string;

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

  /** Training topics (Category codes); unknown codes are dropped against the DB. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  interests?: string[];
}
