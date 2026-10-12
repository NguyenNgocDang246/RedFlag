import { describe, expect, it } from 'vitest';
import { signSvix, verifySvix } from './svix-verify';

const SECRET = `whsec_${Buffer.from('test-secret-key-0123456789').toString('base64')}`;
const OTHER = `whsec_${Buffer.from('another-secret').toString('base64')}`;
const now = new Date('2026-10-12T10:00:00Z');
const ts = String(Math.floor(now.getTime() / 1000));
const body = '{"type":"email.received","data":{}}';

describe('verifySvix', () => {
  it('accepts a body signed with the secret', () => {
    const signature = signSvix(SECRET, 'msg_1', ts, body);
    expect(verifySvix(SECRET, { id: 'msg_1', timestamp: ts, signature }, body, now)).toBe(true);
  });

  it('rejects a changed body, id or a different secret', () => {
    const signature = signSvix(SECRET, 'msg_1', ts, body);
    expect(verifySvix(SECRET, { id: 'msg_1', timestamp: ts, signature }, `${body} `, now)).toBe(false);
    expect(verifySvix(SECRET, { id: 'msg_2', timestamp: ts, signature }, body, now)).toBe(false);
    expect(verifySvix(OTHER, { id: 'msg_1', timestamp: ts, signature }, body, now)).toBe(false);
  });

  it('rejects an old or future timestamp', () => {
    const old = String(Number(ts) - 6 * 60);
    const signature = signSvix(SECRET, 'msg_1', old, body);
    expect(verifySvix(SECRET, { id: 'msg_1', timestamp: old, signature }, body, now)).toBe(false);
  });

  it('accepts when any one of several signatures matches', () => {
    const good = signSvix(SECRET, 'msg_1', ts, body);
    const bad = signSvix(OTHER, 'msg_1', ts, body);
    expect(verifySvix(SECRET, { id: 'msg_1', timestamp: ts, signature: `${bad} ${good}` }, body, now)).toBe(true);
  });

  it('rejects missing headers and malformed signatures', () => {
    expect(verifySvix(SECRET, { id: 'msg_1', timestamp: ts }, body, now)).toBe(false);
    expect(verifySvix(SECRET, { id: 'msg_1', timestamp: ts, signature: 'v1,' }, body, now)).toBe(false);
    expect(verifySvix(SECRET, { id: 'msg_1', timestamp: ts, signature: 'garbage' }, body, now)).toBe(false);
  });
});
