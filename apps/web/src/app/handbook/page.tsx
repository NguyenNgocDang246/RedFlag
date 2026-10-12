import type { Metadata } from 'next';
import { BookMarked } from 'lucide-react';
import { IconHeading } from '@/components/icon-heading';
import type { Locale } from '@/lib/api';
import { HANDBOOK_T } from '@/lib/i18n';
import { fetchBrandsServer } from '@/lib/server-api';
import { HandbookBrowser } from './handbook-browser';
import s from './handbook.module.css';

type Search = { searchParams: Promise<{ locale?: string }> };

const pickLocale = (raw?: string): Locale => (raw === 'vi' ? 'vi' : 'en');

export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const t = HANDBOOK_T[pickLocale((await searchParams).locale)];
  return { title: t.metaTitle, description: t.subtitle };
}

/** Brand handbook (SSR — readable signed out, including from Test flow simulated emails). */
export default async function HandbookPage({ searchParams }: Search) {
  const locale = pickLocale((await searchParams).locale);
  const t = HANDBOOK_T[locale];
  const brands = await fetchBrandsServer(locale);

  return (
    <main className={s.main}>
      <header className={s.head}>
        <IconHeading icon={BookMarked} title={t.title} sub={t.subtitle} />
      </header>
      <HandbookBrowser brands={brands} locale={locale} />
    </main>
  );
}
