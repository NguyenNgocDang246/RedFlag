import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { SUPPORTED_LOCALES, type Locale } from '@redflag/shared';
import { CODE_MESSAGE, CODE_PATTERN } from './common.dto';

/** Each channel is a short list (domains, brand names, hotlines…). */
function ChannelList() {
  return function (target: object, key: string) {
    IsOptional()(target, key);
    IsArray()(target, key);
    ArrayMaxSize(20)(target, key);
    IsString({ each: true })(target, key);
    MaxLength(120, { each: true })(target, key);
  };
}

export class UpdateBrandDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  categoryCode?: string | null;

  @ChannelList()
  websites?: string[];

  @ChannelList()
  emailDomains?: string[];

  @ChannelList()
  smsSenders?: string[];

  @ChannelList()
  hotlines?: string[];

  @ChannelList()
  apps?: string[];

  @ChannelList()
  socialPages?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';
}

/** Code + locale are fixed after creation (one code can exist in several locales). */
export class CreateBrandDto extends UpdateBrandDto {
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code!: string;

  @IsIn(SUPPORTED_LOCALES)
  locale!: Locale;
}
