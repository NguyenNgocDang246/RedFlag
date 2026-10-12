import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { EDITABLE_QUIZ_KINDS } from '@redflag/shared';

/** Content for one locale. May be empty in drafts — publish rules are checked in the service. */
export class QuizTextDto {
  /** Neutral library title — must not reveal the answer. Empty → UI shows "channel · topic". */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsString()
  @MaxLength(500)
  prompt!: string;

  @IsString()
  @MaxLength(2000)
  explanation!: string;

  /** Flat text (SEO/fallback). Empty → generated from scenarioData. */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  scenario?: string;

  @IsObject()
  scenarioData!: Record<string, unknown>;
}

export class QuizTranslationsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => QuizTextDto)
  en?: QuizTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuizTextDto)
  vi?: QuizTextDto;
}

export class SaveQuizDto {
  @IsIn(EDITABLE_QUIZ_KINDS)
  kind!: string;

  @IsBoolean()
  isScam!: boolean;

  @IsInt()
  @Min(1)
  @Max(5)
  difficultyLevel!: number;

  @IsOptional()
  @IsString()
  categoryCode?: string | null;

  @IsBoolean()
  isPublic!: boolean;

  @IsInt()
  @Min(0)
  order!: number;

  @IsArray()
  @IsString({ each: true })
  signalCodes!: string[];

  @ValidateNested()
  @Type(() => QuizTranslationsDto)
  translations!: QuizTranslationsDto;
}
