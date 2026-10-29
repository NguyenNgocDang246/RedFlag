'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ExternalLink, X } from 'lucide-react';
import { fetchBrands, type Brand, type Locale } from '@/lib/api';
import { HANDBOOK_T } from '@/lib/i18n';
import { HandbookBrowser } from './handbook-browser';
import s from './handbook.module.css';

/**
 * 📖 button + handbook drawer, opened during a quiz.
 * Each language is loaded on its first open and kept — switching language loads that
 * language's brands, because a brand belongs to one locale (there is no translation table).
 */
export function HandbookButton({ locale, label }: { locale: Locale; label: string }) {
  const t = HANDBOOK_T[locale];
  const [open, setOpen] = useState(false);
  const [cache, setCache] = useState<Partial<Record<Locale, Brand[]>>>({});
  const [error, setError] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const brands = cache[locale] ?? null;

  useEffect(() => {
    if (!open || brands) return;
    let alive = true;
    setError(false);
    fetchBrands(locale)
      .then((b) => alive && setCache((c) => ({ ...c, [locale]: b })))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [open, brands, locale]);

  // Esc closes; lock background scroll; return focus to the button on close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    const btn = btnRef.current;
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      btn?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`btn btn-secondary btn-sm ${s.trigger}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={label}
        title={label}
      >
        <BookOpen size={16} aria-hidden />
        <span className={s.triggerLabel}>{label}</span>
      </button>

      {open && (
        <div className={s.overlay} onClick={() => setOpen(false)}>
          <aside
            className={s.drawer}
            role="dialog"
            aria-modal="true"
            aria-label={t.title}
            onClick={(e) => e.stopPropagation()}
          >
            <header className={s.drawerHead}>
              <h2>
                <BookOpen size={20} aria-hidden />
                {t.title}
              </h2>
              <button type="button" className={s.close} onClick={() => setOpen(false)} aria-label={t.close}>
                <X size={20} aria-hidden />
              </button>
            </header>
            <div className={s.drawerBody}>
              {error ? (
                <p className={s.empty}>{t.error}</p>
              ) : brands ? (
                <HandbookBrowser brands={brands} locale={locale} autoFocus />
              ) : (
                <p className={s.empty}>{t.loading}</p>
              )}
            </div>
            <footer className={s.drawerFoot}>
              <Link href={`/handbook?locale=${locale}`} target="_blank" className={s.pageLink}>
                {t.openPage}
                <ExternalLink size={14} aria-hidden />
              </Link>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}
