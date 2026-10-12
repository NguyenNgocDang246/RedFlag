'use client';

import { useLocale } from '@/components/site-header';
import { ADMIN_T } from '@/lib/admin-i18n';

/** Admin UI language (from ?locale=, like the rest of the site) + a link helper that keeps it. */
export function useAdmin() {
  const locale = useLocale();
  const href = (path: string) =>
    `${path}${path.includes('?') ? '&' : '?'}locale=${locale}`;
  return { locale, t: ADMIN_T[locale], href };
}
