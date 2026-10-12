import { Locale } from '@prisma/client';

/** Warning text version — bump on text changes, for consent auditing. */
export const CONFIRMATION_TEXT_VERSION = 'v1';

/**
 * Report warning + expected confirmation phrase per locale (i18n).
 * The user must retype `confirmPhrase` exactly to enable Test flow (type-to-confirm).
 */
export const TEST_WARNING_I18N: Record<Locale, { warning: string; confirmPhrase: string }> = {
  en: {
    warning:
      'When a practice email arrives, do NOT use your mail app’s "Report phishing" button. Report it only by forwarding to report@<domain> or using the button on RedFlag.',
    confirmPhrase: 'I have read and understood',
  },
  vi: {
    warning:
      'Khi nhận được email bài tập, ĐỪNG dùng nút "Báo cáo lừa đảo" của ứng dụng mail. Chỉ report bằng cách forward tới report@<domain> hoặc dùng nút trên RedFlag.',
    confirmPhrase: 'Tôi đã đọc và hiểu',
  },
};

/** Normalizes input so matching is forgiving for non-technical users (R9). */
export function normalizePhrase(input: string): string {
  return input
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!…]+$/u, '');
}

export function expectedPhrase(locale: Locale): string {
  return (TEST_WARNING_I18N[locale] ?? TEST_WARNING_I18N.en).confirmPhrase;
}

export function confirmationMatches(input: string | undefined, locale: Locale): boolean {
  if (!input) return false;
  return normalizePhrase(input) === normalizePhrase(expectedPhrase(locale));
}
