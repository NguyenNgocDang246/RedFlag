import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Template codes read like BANK-001: capitals, digits, `-` and `_`. */
export const TEMPLATE_CODE_PATTERN = /^[A-Z][A-Z0-9_-]{1,31}$/;

/** One language of one email. All blank = that language is not written yet. */
export class VariantTextDto {
  @IsString()
  @MaxLength(80)
  senderName!: string;

  @IsString()
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MaxLength(5000)
  body!: string;
}

export class VariantTextsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => VariantTextDto)
  en?: VariantTextDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => VariantTextDto)
  vi?: VariantTextDto;
}

export class VariantDto {
  /** Present = an existing variant; absent = a new one. */
  @IsOptional()
  @IsString()
  id?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  difficultyLevel!: number;

  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  signalCodes!: string[];

  @ValidateNested()
  @Type(() => VariantTextsDto)
  translations!: VariantTextsDto;
}

export class TemplateTitlesDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  en?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  vi?: string;
}

/** The whole template, saved at once. Publish rules are checked in the service. */
export class SaveTestEmailDto {
  /** Only read on create; fixed afterwards. */
  @IsOptional()
  @Matches(TEMPLATE_CODE_PATTERN, {
    message: 'code: CHỮ_HOA, số, - và _; 2–32 ký tự, bắt đầu bằng chữ (VD: BANK-002)',
  })
  code?: string;

  @IsString()
  categoryCode!: string;

  @ValidateNested()
  @Type(() => TemplateTitlesDto)
  titles!: TemplateTitlesDto;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants!: VariantDto[];

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';
}
