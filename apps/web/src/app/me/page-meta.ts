import type { Metadata } from 'next';
import type { Locale } from '@/lib/api';
import { ME_T } from '@/lib/i18n';

export type MeSearch = { searchParams: Promise<{ locale?: string }> };

export const pickLocale = (raw?: string): Locale => (raw === 'vi' ? 'vi' : 'en');

/** "<section> - RedFlag", never indexed. */
export function meMetadata(section: keyof (typeof ME_T)['en']['nav']) {
  return async ({ searchParams }: MeSearch): Promise<Metadata> => {
    const t = ME_T[pickLocale((await searchParams).locale)];
    return { title: `${t.nav[section]} - RedFlag`, robots: { index: false } };
  };
}
