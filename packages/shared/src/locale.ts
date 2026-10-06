/**
 * Locale — ngôn ngữ nội dung. Mặc định EN (phạm vi global), VI là bổ sung.
 * Nội dung đa ngôn ngữ nằm ở tầng data (R6); đây là tập locale được hỗ trợ.
 */
export const Locale = {
  EN: 'en',
  VI: 'vi',
} as const;

export type Locale = (typeof Locale)[keyof typeof Locale];

export const DEFAULT_LOCALE: Locale = Locale.EN;

export const SUPPORTED_LOCALES = Object.values(Locale);

export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as string[]).includes(value);
}
