import { describe, expect, it } from 'vitest';
import { SIM_EMAIL_HEADERS, renderSimEmail, simEmailParagraphs } from '@redflag/shared';

const base = {
  locale: 'en' as const,
  subject: 'Your parcel is waiting',
  body: 'Hi {{name}},\n\nYour parcel is on hold.\n\n[[Pay the fee]]\n\nQuickShip',
  linkUrl: 'https://mail-check.example/t/abc123',
};

describe('renderSimEmail', () => {
  it('greets by name, and falls back to a neutral word per locale', () => {
    expect(renderSimEmail({ ...base, name: 'Mai' }).text).toContain('Hi Mai,');
    expect(renderSimEmail({ ...base, name: '  ' }).text).toContain('Hi there,');
    expect(renderSimEmail({ ...base, locale: 'vi', body: 'Chào {{name}},' }).text).toContain('Chào bạn,');
  });

  it('points the [[link]] at the tracking url in both HTML and text', () => {
    const mail = renderSimEmail(base);
    expect(mail.html).toContain(`href="${base.linkUrl}"`);
    expect(mail.text).toContain(`Pay the fee: ${base.linkUrl}`);
    expect(mail.html).not.toContain('[[');
    expect(mail.text).not.toContain('[[');
  });

  it('escapes content so authored text cannot inject markup', () => {
    const mail = renderSimEmail({ ...base, body: 'Hello <script>alert(1)</script> & co' });
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).not.toContain('<script>');
    // The text part keeps the characters as typed.
    expect(mail.text).toBe('Hello <script>alert(1)</script> & co');
  });

  it('includes the open pixel only when a url is given (previews have none)', () => {
    expect(renderSimEmail({ ...base, openPixelUrl: 'https://mail-check.example/o/abc' }).html).toContain(
      'https://mail-check.example/o/abc',
    );
    expect(renderSimEmail(base).html).not.toContain('<img');
  });

  it('keeps the body free of any "this is practice" marker, which would void the exercise (R3)', () => {
    const mail = renderSimEmail({ ...base, name: 'Mai' });
    // Nothing in what the learner reads — including the link they can hover — names the product
    // or calls itself an exercise; the tracking host is a separate unbranded RedFlag domain.
    for (const text of [mail.html, mail.text]) {
      expect(text.toLowerCase()).not.toContain('redflag');
      expect(text.toLowerCase()).not.toContain('practice');
    }
    // It is identified by headers instead, so an exercise can still be told apart when reconciling.
    expect(SIM_EMAIL_HEADERS['X-RedFlag-Simulation']).toBe('yes');
  });

  it('splits paragraphs on blank lines', () => {
    expect(simEmailParagraphs(base.body, 'en', 'Mai')).toEqual([
      'Hi Mai,',
      'Your parcel is on hold.',
      '[[Pay the fee]]',
      'QuickShip',
    ]);
  });
});
