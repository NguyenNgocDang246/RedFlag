'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Locale } from '@/lib/api';
import s from './site.module.css';

const STORAGE_KEY = 'redflag_locale';

/**
 * Language switch: keeps the locale in the URL (?locale=) for SSR/SEO, but uses
 * router.replace (NOT push) so Back doesn't return to the old locale.
 * The choice is remembered in localStorage.
 */
export function LocaleSwitch({ current }: { current: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const explicit = params.get('locale'); // null if the URL has no ?locale

  // First visit without ?locale: apply the saved preference, if any.
  useEffect(() => {
    if (explicit) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      // storage blocked -> ignore
    }
    if (saved && (saved === 'en' || saved === 'vi') && saved !== current) {
      router.replace(`${pathname}?locale=${saved}`);
    }
  }, [explicit, current, router, pathname]);

  const choose = (l: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore if it can't be written
    }
    // Keep every other param (filters, current question, current set…) — only change locale.
    // Read from window.location because the runner updates the URL via history.replaceState.
    const next = new URLSearchParams(window.location.search);
    next.set('locale', l);
    router.replace(`${pathname}?${next}`);
  };

  return (
    <div className={s.seg} role="group" aria-label="Language">
      {(['en', 'vi'] as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={current === l}
          className={current === l ? s.segOn : s.segBtn}
          onClick={() => choose(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
