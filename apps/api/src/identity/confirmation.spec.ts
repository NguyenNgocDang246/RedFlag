import { describe, expect, it } from 'vitest';
import { confirmationMatches, expectedPhrase, normalizePhrase } from './confirmation';

describe('confirmation (type-to-confirm)', () => {
  it('has distinct expected phrases per locale', () => {
    expect(expectedPhrase('en')).toBe('I have read and understood');
    expect(expectedPhrase('vi')).toBe('Tôi đã đọc và hiểu');
  });

  it('normalizes case, surrounding space, inner space and trailing punctuation', () => {
    expect(normalizePhrase('  I  have   read and understood. ')).toBe(
      'i have read and understood',
    );
  });

  it('accepts lenient but correct input (R9-friendly)', () => {
    expect(confirmationMatches('  Tôi đã ĐỌC và hiểu. ', 'vi')).toBe(true);
    expect(confirmationMatches('i have read and understood', 'en')).toBe(true);
  });

  it('rejects wrong or empty input', () => {
    expect(confirmationMatches('something else', 'vi')).toBe(false);
    expect(confirmationMatches(undefined, 'en')).toBe(false);
    // right phrase, wrong locale
    expect(confirmationMatches('I have read and understood', 'vi')).toBe(false);
  });
});
