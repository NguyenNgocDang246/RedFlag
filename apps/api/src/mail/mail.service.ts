import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

/**
 * MailService — sends transactional email (e.g. email verification).
 * Dev uses Mailpit (fake SMTP). Simulated campaign email will go through delivery/worker
 * queues in Phase 4; this is just the lightweight transactional channel.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = createTransport({
      host: process.env.SMTP_HOST ?? 'localhost',
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    const from = process.env.MAIL_FROM ?? 'RedFlag <no-reply@redflag.local>';
    await this.transporter.sendMail({ from, to, subject, html });
    this.logger.log(`Sent "${subject}" to ${to}`);
  }
}
