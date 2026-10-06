import { Locale } from '@prisma/client';

/** Phiên bản text cảnh báo — tăng khi đổi nội dung để audit consent. */
export const CONFIRMATION_TEXT_VERSION = 'v1';

/**
 * Cảnh báo report + câu xác nhận kỳ vọng, theo locale (i18n).
 * User phải gõ lại đúng `confirmPhrase` mới được bật Test flow (type-to-confirm).
 */
export const TEST_WARNING_I18N: Record<Locale, { warning: string; confirmPhrase: string }> = {
  en: {
    warning:
      'When a practice email arrives, do NOT use your mail app’s "Report phishing" button. Report it only by forwarding to report@<domain> or using the button on PhishGym.',
    confirmPhrase: 'I have read and understood',
  },
  vi: {
    warning:
      'Khi nhận được email bài tập, ĐỪNG dùng nút "Báo cáo lừa đảo" của ứng dụng mail. Chỉ report bằng cách forward tới report@<domain> hoặc dùng nút trên PhishGym.',
    confirmPhrase: 'Tôi đã đọc và hiểu',
  },
};

/** Chuẩn hoá để so khớp công bằng cho người dùng phổ thông (R9). */
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
