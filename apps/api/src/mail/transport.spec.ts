import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMailTransport, ResendTransport } from './transport';

const message = {
  to: 'someone@example.com',
  from: '"Sao Mai Bank" <no-reply@redflag.test>',
  subject: 'Hello',
  html: '<p>Hello</p>',
  text: 'Hello',
  headers: { 'X-RedFlag-Simulation': 'yes' },
  idempotencyKey: 'campaign-1',
};

describe('ResendTransport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete process.env.MAIL_TRANSPORT;
    delete process.env.RESEND_API_KEY;
  });

  it('posts the message and returns the id Resend gives back', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'msg_1' })));
    vi.stubGlobal('fetch', fetchMock);

    expect(await new ResendTransport('re_key').send(message)).toBe('msg_1');

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer re_key',
      // Lets a retried campaign send land once.
      'Idempotency-Key': 'campaign-1',
    });
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      // The display name imitates a brand; the address stays RedFlag's own (R3/R4).
      from: '"Sao Mai Bank" <no-reply@redflag.test>',
      to: ['someone@example.com'],
      text: 'Hello',
      headers: { 'X-RedFlag-Simulation': 'yes' },
    });
  });

  it('retries a rate-limited send, since Resend allows only a couple per second', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('slow down', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'msg_2' })));
    vi.stubGlobal('fetch', fetchMock);

    const sending = new ResendTransport('re_key').send(message);
    await vi.advanceTimersByTimeAsync(1000);

    expect(await sending).toBe('msg_2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up on a rejection that retrying cannot fix', async () => {
    const fetchMock = vi.fn(async () => new Response('bad from address', { status: 422 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(new ResendTransport('re_key').send(message)).rejects.toThrow(/422/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('createMailTransport', () => {
  afterEach(() => {
    delete process.env.MAIL_TRANSPORT;
    delete process.env.RESEND_API_KEY;
  });

  it('uses SMTP for dev and Resend as soon as there is an API key', () => {
    expect(createMailTransport().name).toBe('smtp');
    process.env.RESEND_API_KEY = 're_key';
    expect(createMailTransport().name).toBe('resend');
  });

  it('lets MAIL_TRANSPORT override, and says so when the key is missing', () => {
    process.env.MAIL_TRANSPORT = 'smtp';
    process.env.RESEND_API_KEY = 're_key';
    expect(createMailTransport().name).toBe('smtp');

    process.env.MAIL_TRANSPORT = 'resend';
    delete process.env.RESEND_API_KEY;
    expect(() => createMailTransport()).toThrow(/RESEND_API_KEY/);
  });
});
