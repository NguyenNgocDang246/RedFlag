import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import { InboundReportService } from './inbound-report.service';
import { verifySvix } from './svix-verify';

/**
 * Resend's inbound webhook: mail forwarded to REPORT_EMAIL arrives here as metadata only.
 *
 * Public by necessity, so the Svix signature over the raw body is what authorises a call. Nothing
 * about the mail is logged or stored — only whether it matched a campaign (R2).
 */
@Controller('inbound')
export class InboundController {
  private readonly logger = new Logger(InboundController.name);
  private warnedNoSecret = false;

  constructor(private readonly inbound: InboundReportService) {}

  @Post('resend')
  @HttpCode(200)
  async resend(
    @Req() req: RawBodyRequest<Request>,
    @Headers('svix-id') id?: string,
    @Headers('svix-timestamp') timestamp?: string,
    @Headers('svix-signature') signature?: string,
  ) {
    const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
    if (!secret) {
      if (!this.warnedNoSecret) {
        this.logger.warn('RESEND_WEBHOOK_SECRET is not set — forwarded reports are turned off');
        this.warnedNoSecret = true;
      }
      throw new ServiceUnavailableException();
    }

    const raw = req.rawBody?.toString('utf8') ?? '';
    if (!verifySvix(secret, { id, timestamp, signature }, raw)) throw new UnauthorizedException();

    let event: unknown;
    try {
      event = JSON.parse(raw);
    } catch {
      return { ok: true };
    }

    // Always 200 once the signature holds: an unmatched forward is a normal outcome, not something
    // Resend should keep retrying.
    const outcome = await this.inbound.handle(event as Parameters<InboundReportService['handle']>[0]);
    if (outcome.result === 'matched') {
      this.logger.log(`Forwarded report matched campaign ${outcome.campaignId}`);
    } else if (outcome.result === 'unmatched') {
      this.logger.log('Forwarded report did not match a campaign');
    }
    return { ok: true };
  }
}
