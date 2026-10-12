import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class AnswerQuizDto {
  @IsBoolean()
  answeredScam!: boolean;

  // Signals are data (admins can add more) — unknown codes just don't match, so they count as wrong picks.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  selectedSignals?: string[];
}
