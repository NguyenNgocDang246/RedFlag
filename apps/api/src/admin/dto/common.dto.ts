import { IsIn } from 'class-validator';

export const CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,31}$/;
export const CODE_MESSAGE = 'code: CHỮ_HOA, số, gạch dưới; 2–32 ký tự, bắt đầu bằng chữ';

export class StatusDto {
  @IsIn(['draft', 'published'])
  status!: 'draft' | 'published';
}
