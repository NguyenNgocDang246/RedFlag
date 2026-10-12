import { Injectable, Logger } from '@nestjs/common';
import { SIM_EMAIL_HEADERS } from '@redflag/shared';
import { createMailTransport, type MailTransport } from './transport';

/**
 * MailService — the only place that sends mail.
 * Dev uses Mailpit (a fake SMTP sink with a web UI); production uses Resend (see ./transport.ts).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: MailTransport;

  constructor() {
    this.transport = createMailTransport();
  }

  private get from(): string {
    return process.env.MAIL_FROM ?? 'RedFlag <no-reply@redflag.local>';
  }

  /** The address part of MAIL_FROM — simulations reuse it with a different display name. */
  private get fromAddress(): string {
    const match = /<([^>]+)>/.exec(this.from);
    return match ? match[1] : this.from;
  }

  /** RedFlag's own mail (verification, password reset…). `text` is the plain-text twin. */
  async send(to: string, subject: string, html: string, text?: string): Promise<void> {
    await this.transport.send({ to, from: this.from, subject, html, text });
    this.logger.log(`Sent "${subject}" to ${to}`);
  }

  /**
   * Sends a simulated test email to a user who opted in to being tested (R1).
   *
   * Two things are fixed here rather than taken from content, so no authored template can change
   * them: the envelope address is always RedFlag's own (only the display name imitates a brand, and
   * only a fictional one — R3/R4), and every message carries the simulation headers that let it be
   * identified when reconciling, without the learner seeing anything (R3).
   *
   * Returns the provider's message id, for matching bounces later.
   */
  async sendSimulation(args: {
    to: string;
    senderName: string;
    subject: string;
    html: string;
    text: string;
    /** Resend: makes a retried send of the same campaign land once. */
    idempotencyKey?: string;
  }): Promise<string | undefined> {
    const from = args.senderName.trim()
      ? `"${args.senderName.replace(/"/g, '')}" <${this.fromAddress}>`
      : this.from;
    const id = await this.transport.send({
      to: args.to,
      from,
      subject: args.subject,
      html: args.html,
      text: args.text,
      headers: SIM_EMAIL_HEADERS,
      idempotencyKey: args.idempotencyKey,
    });
    this.logger.log(`Sent simulation "${args.subject}" to ${args.to}`);
    return id;
  }
}
