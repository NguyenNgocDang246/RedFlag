import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { SUPPORTED_LOCALES, TestFrequency } from '@redflag/shared';

export class ProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  servicesUsed?: string[];

  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: string;
}

export class TrainingDto {
  // Categories are data (admins can add more) — the service filters against the categories table.
  @IsArray()
  @IsString({ each: true })
  @MaxLength(32, { each: true })
  interests!: string[];
}

export class TestDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsIn(Object.values(TestFrequency))
  frequency?: string;

  // Phrase retyped by the user (type-to-confirm) — required when enabled = true.
  @IsOptional()
  @IsString()
  confirmationText?: string;
}

export class OnboardingDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileDto)
  profile?: ProfileDto;

  @ValidateNested()
  @Type(() => TrainingDto)
  training!: TrainingDto;

  @ValidateNested()
  @Type(() => TestDto)
  test!: TestDto;
}
