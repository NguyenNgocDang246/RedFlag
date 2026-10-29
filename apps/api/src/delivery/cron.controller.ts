import { timingSafeEqual } from 'node:crypto';
import {
  Controller,
  Get,
  Headers,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { SchedulerService } from './scheduler.service';
import { CronDailyResponse } from './dto/delivery-response.dto';

/** Constant-time compare, so the secret can't be guessed byte by byte from response times. */
function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The daily job behind the email tests when hosted on Vercel (see apps/api/vercel.json), standing in
 * for the long-running worker: plan what is due, then hand the next day's tests to the mail
 * provider with their delivery times. Both passes are idempotent, so a repeated call is harmless.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; nothing else can trigger it.
 */
@ApiTags('cron')
@ApiBearerAuth()
@Controller('cron')
export class CronController {
  private readonly logger = new Logger(CronController.name);

  constructor(
    private readonly scheduler: SchedulerService,
    private readonly delivery: DeliveryService,
  ) {}

  @Get('daily')
  async daily(@Headers('authorization') authorization?: string): Promise<CronDailyResponse> {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) throw new ServiceUnavailableException('CRON_SECRET is not set');
    if (!authorization || !sameSecret(authorization, `Bearer ${secret}`)) throw new UnauthorizedException();

    const planned = await this.scheduler.planDue();
    const handedOff = await this.delivery.handOffDue();
    this.logger.log(`Daily run: planned ${planned}, handed off ${handedOff}`);
    return { planned, handedOff };
  }
}
