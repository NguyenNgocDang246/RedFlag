import { Injectable } from '@nestjs/common';
import { sendWindowFromEnv, type SendWindow } from './send-window';

/**
 * Every externally-visible address the email tests depend on, read from the environment in one
 * place. Nothing below is hard-coded anywhere else, so a deployment can move domains without code
 * changes.
 */
@Injectable()
export class DeliveryConfig {
  /**
   * Host the tracked links in test emails point at. A RedFlag-owned domain, but deliberately not the
   * product one: a link reading "redflag" would give the exercise away on hover.
   */
  get trackingUrl(): string {
    return (process.env.TRACKING_PUBLIC_URL ?? process.env.API_PUBLIC_URL ?? 'http://localhost:4000').replace(
      /\/+$/,
      '',
    );
  }

  /** The learner-facing site, where the teach page lives. */
  get webUrl(): string {
    return (process.env.WEB_PUBLIC_URL ?? 'http://localhost:4001').replace(/\/+$/, '');
  }

  /** Local hours during which a test may arrive. */
  get sendWindow(): SendWindow {
    return sendWindowFromEnv();
  }

  clickUrl(token: string): string {
    return `${this.trackingUrl}/api/t/${token}`;
  }

  openPixelUrl(token: string): string {
    return `${this.trackingUrl}/api/o/${token}`;
  }

  /** Where a click lands: the teach page, addressed by the same unguessable token (R5). */
  caughtUrl(token: string, locale: string): string {
    return `${this.webUrl}/caught?t=${encodeURIComponent(token)}&locale=${encodeURIComponent(locale)}`;
  }
}
