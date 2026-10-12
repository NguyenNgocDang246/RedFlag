import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CODE_MESSAGE, CODE_PATTERN } from './common.dto';

// ─── Category ───

export class CategoryTextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CategoryTranslationsDto {
  @ValidateNested()
  @Type(() => CategoryTextDto)
  en!: CategoryTextDto;

  @ValidateNested()
  @Type(() => CategoryTextDto)
  vi!: CategoryTextDto;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  impersonates?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ValidateNested()
  @Type(() => CategoryTranslationsDto)
  translations!: CategoryTranslationsDto;
}

export class CreateCategoryDto extends UpdateCategoryDto {
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code!: string;
}

// ─── Signal ───

export class SignalTextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  explanation!: string;
}

export class SignalTranslationsDto {
  @ValidateNested()
  @Type(() => SignalTextDto)
  en!: SignalTextDto;

  @ValidateNested()
  @Type(() => SignalTextDto)
  vi!: SignalTextDto;
}

export class UpdateSignalDto {
  @ValidateNested()
  @Type(() => SignalTranslationsDto)
  translations!: SignalTranslationsDto;
}

export class CreateSignalDto extends UpdateSignalDto {
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code!: string;
}
