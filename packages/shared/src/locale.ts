/**
 * Content language. EN is the default (global scope), VI is additional.
 * Translated content lives in the data layer (R6); this is the supported set.
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
