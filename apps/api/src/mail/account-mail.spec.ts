import { describe, expect, it } from 'vitest';
import { renderAccountMail } from './account-mail';

describe('renderAccountMail', () => {
  it('writes each locale in its own language', () => {
    const en = renderAccountMail('reset', 'en', { link: 'https://redflag.test/r?t=1' });
    const vi = renderAccountMail('reset', 'vi', { link: 'https://redflag.test/r?t=1' });
    expect(en.subject).not.toBe(vi.subject);
    expect(vi.html).toContain('lang="vi"');
    expect(en.html).toContain('https://redflag.test/r?t=1');
  });

  it('escapes the link instead of letting it break out of the markup', () => {
    const mail = renderAccountMail('verify', 'en', {
      link: 'https://redflag.test/v?t="><script>alert(1)</script>',
    });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
  });

  it('ships a plain-text twin carrying the link', () => {
    const mail = renderAccountMail('passwordChanged', 'vi', { link: 'https://redflag.test/f' });
    expect(mail.text).toContain('https://redflag.test/f');
    expect(mail.text).not.toContain('<');
  });

  it('tells the reader what RedFlag never asks for', () => {
    expect(renderAccountMail('verify', 'en', { link: 'x' }).text).toContain('never ask');
    expect(renderAccountMail('verify', 'vi', { link: 'x' }).text).toContain('không bao giờ hỏi');
  });
});
