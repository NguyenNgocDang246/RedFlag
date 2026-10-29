import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Locale } from '@prisma/client';
import { isSupportedLocale } from '@redflag/shared';
import type { Response } from 'express';
import { DeliveryConfig } from './delivery.config';
import { TrackingService } from './tracking.service';
import { TeachContentResponse } from './dto/delivery-response.dto';

/** 1×1 transparent GIF, returned for every pixel request whether the token resolved or not. */
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

/**
 * Endpoints the user's mail client hits. Public by necessity — there are no cookies in an email —
 * so the unguessable per-campaign token is what authorises them (R5), and nothing here reads or
 * stores user input (R2).
 *
 * Paths are kept short and unbranded (`/t/…`, `/o/…`): a link that announced the product would give
 * the exercise away before the learner had a chance to spot it.
 */
@ApiTags('tracking')
@Controller()
export class TrackingController {
  constructor(
    private readonly tracking: TrackingService,
    private readonly config: DeliveryConfig,
  ) {}

  @Get('o/:token')
  @ApiOkResponse({
    description: '1×1 transparent GIF, whether or not the token resolved.',
    content: { 'image/gif': { schema: { type: 'string', format: 'binary' } } },
  })
  async open(@Param('token') token: string, @Res() res: Response) {
    await this.tracking.registerOpen(token);
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.send(PIXEL);
  }

  /**
   * Clicking the link in a simulated scam counts as caught. The user is redirected straight to the
   * teach page — no fake form is shown and nothing is ever asked of them (R2).
   */
  @Get('t/:token')
  @ApiFoundResponse({ description: 'Redirects to the teach page, or to the site when the token is unknown.' })
  async click(@Param('token') token: string, @Res() res: Response) {
    const hit = await this.tracking.registerClick(token);
    if (!hit) {
      // Expired or unknown: send them to the site rather than showing an error from a mail link.
      res.redirect(302, this.config.webUrl);
      return;
    }
    res.redirect(302, this.config.caughtUrl(token, hit.locale));
  }

  /** Content for the teach page, addressed by the same token. Returns nothing about the recipient. */
  @Get('t/:token/teach')
  teach(@Param('token') token: string, @Query('locale') locale?: string): Promise<TeachContentResponse> {
    const parsed = locale && isSupportedLocale(locale) ? (locale as Locale) : undefined;
    return this.tracking.teachContent(token, parsed);
  }
}
