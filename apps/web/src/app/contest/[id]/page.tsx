import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { Locale } from '@/lib/api';
import { CONTEST_T } from '@/lib/i18n';
import { fetchMeServer } from '@/lib/server-api';
import { ContestRunner } from './contest-runner';
import ts from '../../train/train.module.css';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string }>;
};

const pickLocale = (raw?: string): Locale => (raw === 'vi' ? 'vi' : 'en');

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const t = CONTEST_T[pickLocale((await searchParams).locale)];
  return { title: t.metaTitle, robots: { index: false } };
}

/** Contest player. Questions are fetched client-side, one at a time — nothing is SSR'd (no answers, no SEO). */
export default async function ContestRunPage({ params, searchParams }: Props) {
  const [{ id }, { locale: raw }] = await Promise.all([params, searchParams]);
  const locale = pickLocale(raw);
  if (!(await fetchMeServer())) redirect(`/contest?locale=${locale}`);
  return (
    // Same frame as /train (fixed-height card, the simulation scrolls on its own).
    <main className={ts.main}>
      <ContestRunner id={id} locale={locale} />
    </main>
  );
}
