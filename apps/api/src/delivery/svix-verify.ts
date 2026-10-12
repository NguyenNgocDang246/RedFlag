import { createHmac, timingSafeEqual } from 'node:crypto';

/** How far a webhook's timestamp may drift from our clock before it is treated as a replay. */
export const SVIX_TOLERANCE_SECONDS = 5 * 60;

export interface SvixHeaders {
  id?: string;
  timestamp?: string;
  signature?: string;
}

/** The secret as Resend shows it (`whsec_<base64>`) → the raw HMAC key. */
function secretKey(secret: string): Buffer {
  return Buffer.from(secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret, 'base64');
}

export function signSvix(secret: string, id: string, timestamp: string, body: string): string {
  const mac = createHmac('sha256', secretKey(secret)).update(`${id}.${timestamp}.${body}`).digest('base64');
  return `v1,${mac}`;
}

/**
 * Checks a Resend (Svix) webhook signature against the raw request body. Done by hand with
 * node:crypto rather than pulling in the Svix SDK — it is one HMAC.
 *
 * The signature header may carry several space-separated `v1,<base64>` entries (key rotation);
 * any one matching is enough.
 */
export function verifySvix(
  secret: string,
  headers: SvixHeaders,
  body: string,
  now: Date = new Date(),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return false;
  if (Math.abs(now.getTime() / 1000 - sentAt) > SVIX_TOLERANCE_SECONDS) return false;

  const expected = Buffer.from(signSvix(secret, id, timestamp, body).slice('v1,'.length), 'base64');
  return signature.split(' ').some((entry) => {
    const [version, value] = entry.split(',', 2);
    if (version !== 'v1' || !value) return false;
    const given = Buffer.from(value, 'base64');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
