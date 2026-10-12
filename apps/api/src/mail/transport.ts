import { Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

/** One outgoing message, already rendered. `from` carries the display name. */
export interface MailMessage {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  /** Resend only: makes a retried send land once. */
  idempotencyKey?: string;
}

/** Sends a message and returns the provider's id, for matching bounces later. */
export interface MailTransport {
  readonly name: string;
  send(msg: MailMessage): Promise<string | undefined>;
}

/** Dev: Mailpit on localhost:1025. Also any plain SMTP provider (incl. Resend's SMTP interface). */
export class SmtpTransport implements MailTransport {
  readonly name = 'smtp';
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

  async send(msg: MailMessage): Promise<string | undefined> {
    const info = (await this.transporter.sendMail({
      from: msg.from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      headers: msg.headers,
    })) as { messageId?: string };
    return info.messageId;
  }
}

const RESEND_URL = process.env.RESEND_API_URL ?? 'https://api.resend.com/emails';
/** Resend's default is 2 requests/second — a 429 is normal under a send burst, not a failure. */
const RETRY_DELAYS_MS = [600, 1500, 3000];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Resend over HTTPS (no SDK — one fetch). Carries everything the simulations need: a display name
 * on a verified sending address, custom headers, and a plain-text twin.
 */
export class ResendTransport implements MailTransport {
  readonly name = 'resend';
  private readonly logger = new Logger(ResendTransport.name);

  constructor(private readonly apiKey: string) {}

  async send(msg: MailMessage): Promise<string | undefined> {
    const body = JSON.stringify({
      from: msg.from,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      ...(msg.text ? { text: msg.text } : {}),
      ...(msg.headers ? { headers: msg.headers } : {}),
    });
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
    if (msg.idempotencyKey) headers['Idempotency-Key'] = msg.idempotencyKey;

    for (let attempt = 0; ; attempt++) {
      const res = await fetch(RESEND_URL, { method: 'POST', headers, body });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { id?: string };
        return data.id;
      }
      const detail = await res.text().catch(() => '');
      // 429 = rate limit, 5xx = their side: both are worth another try.
      const retriable = res.status === 429 || res.status >= 500;
      if (!retriable || attempt >= RETRY_DELAYS_MS.length) {
        throw new Error(`Resend rejected the message (${res.status}): ${detail.slice(0, 300)}`);
      }
      this.logger.warn(`Resend ${res.status}, retrying in ${RETRY_DELAYS_MS[attempt]}ms`);
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}

/**
 * Picks the transport from env: an explicit MAIL_TRANSPORT wins, otherwise a RESEND_API_KEY means
 * Resend and anything else means SMTP (dev's Mailpit). Nothing else in the app knows which is used.
 */
export function createMailTransport(): MailTransport {
  const logger = new Logger('MailTransport');
  const choice = (process.env.MAIL_TRANSPORT ?? '').trim().toLowerCase();
  const key = process.env.RESEND_API_KEY?.trim();

  if (choice === 'resend' || (!choice && key)) {
    if (!key) throw new Error('MAIL_TRANSPORT=resend needs RESEND_API_KEY');
    logger.log('Sending through Resend');
    return new ResendTransport(key);
  }
  if (process.env.NODE_ENV === 'production') {
    logger.warn('Sending through plain SMTP in production — set RESEND_API_KEY to use Resend');
  }
  return new SmtpTransport();
}
