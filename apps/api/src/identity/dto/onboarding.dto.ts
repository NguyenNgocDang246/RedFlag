import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ALL_CATEGORY_CODES, SUPPORTED_LOCALES, TestFrequency } from '@phishgym/shared';

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
  @IsArray()
  @IsIn(ALL_CATEGORY_CODES, { each: true })
  interests!: string[];
}

export class TestDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsIn(Object.values(TestFrequency))
  frequency?: string;

  // Câu user gõ lại (type-to-confirm) — bắt buộc khi enabled = true.
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
