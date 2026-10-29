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
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { InboundReportService } from './inbound-report.service';
import { MailFeedbackService } from './mail-feedback.service';
import { verifySvix } from './svix-verify';
import { OkResponse } from '../common/responses.dto';

/**
 * Resend's webhook. One endpoint, several event types:
 * - `email.received`: mail forwarded to REPORT_EMAIL, as metadata only.
 * - `email.bounced` / `email.complained`: a test email bounced or was marked as spam.
 *
 * Public by necessity, so the Svix signature over the raw body is what authorises a call. Nothing
 * about the mail is logged or stored — only whether it matched a campaign (R2).
 */
@ApiTags('inbound')
@Controller('inbound')
export class InboundController {
  private readonly logger = new Logger(InboundController.name);
  private warnedNoSecret = false;

  constructor(
    private readonly inbound: InboundReportService,
    private readonly feedback: MailFeedbackService,
  ) {}

  @Post('resend')
  @HttpCode(200)
  async resend(
    @Req() req: RawBodyRequest<Request>,
    @Headers('svix-id') id?: string,
    @Headers('svix-timestamp') timestamp?: string,
    @Headers('svix-signature') signature?: string,
  ): Promise<OkResponse> {
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

    // Always 200 once the signature holds: an unmatched forward or an unknown message id is a normal
    // outcome, not something Resend should keep retrying.
    const type = (event as { type?: unknown } | null)?.type;
    if (MailFeedbackService.handles(type)) {
      await this.feedback.handle(event as Parameters<MailFeedbackService['handle']>[0]);
      return { ok: true };
    }

    const outcome = await this.inbound.handle(event as Parameters<InboundReportService['handle']>[0]);
    if (outcome.result === 'matched') {
      this.logger.log(`Forwarded report matched campaign ${outcome.campaignId}`);
    } else if (outcome.result === 'unmatched') {
      this.logger.log('Forwarded report did not match a campaign');
    }
    return { ok: true };
  }
}
