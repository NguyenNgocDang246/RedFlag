import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AnswerContestDto {
  /** Position of the question being answered — must be the one currently open. */
  @IsInt()
  @Min(0)
  @Max(1000)
  position!: number;

  @IsBoolean()
  answeredScam!: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  selectedSignals?: string[];

  /** Hotspot keys picked ("SIGNAL|text") — only used to explain picks on the review screen. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  selectedSpots?: string[];
}
