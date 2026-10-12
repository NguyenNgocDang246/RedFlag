import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft, Gauge, Hash, Shuffle, Tag } from 'lucide-react';
import type { Facets, Locale, QuizFilter, QuizQuestion } from '@/lib/api';
import { TRAIN_T } from '@/lib/i18n';
import {
  fetchFacetsServer,
  fetchMeServer,
  fetchNextQuizServer,
  fetchQuizByIdServer,
  fetchQuizServer,
} from '@/lib/server-api';
import { HandbookButton } from '../handbook/handbook-drawer';
import { CategoryIcon } from './category-icon';
import { KindIcon } from './kind-icon';
import { TrainRunner, type RunnerMode } from './train-runner';
import s from './train.module.css';

type Search = {
  searchParams: Promise<{
    locale?: string;
    category?: string;
    kind?: string;
    signal?: string;
    level?: string;
    /** Take exactly one question (opened from the library). */
    id?: string;
    /** Library query, to return to the same page/filters. */
    from?: string;
    /** Current set (comma-separated ids) — the runner writes it to the URL so switching language keeps the quiz. */
    set?: string;
    /** Position of the current question in the set (1-based). */
    q?: string;
  }>;
};

// SEO: metadata render theo locale (server).
export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const { locale } = await searchParams;
  const t = TRAIN_T[locale === 'vi' ? 'vi' : 'en'];
  return { title: `${t.title} — RedFlag`, description: t.subtitle };
}

/**
 * The practice player. Two entry points:
 * - From /practice (?category= / ?kind= / ?signal= / ?level=): the server draws a random round of 10;
 *   "Continue" fetches 10 more unseen ones.
 * - From /library (?id=): that exact question, then back to the library or on to the next one.
 * The runner is still SSR'd, so quiz content is in the HTML (SEO).
 */
export default async function TrainPage({ searchParams }: Search) {
  const { locale: raw, category, kind, signal, level, id, from, set, q: pos } = await searchParams;
  const locale: Locale = raw === 'vi' ? 'vi' : 'en';
  const t = TRAIN_T[locale];
  const filter: QuizFilter = { category, kind, signal, level };

  const [me, facets] = await Promise.all([fetchMeServer(), id ? null : fetchFacetsServer(locale)]);
  let questions: QuizQuestion[];
  let mode: RunnerMode;
  let backHref = `/practice?locale=${locale}`;

  if (id) {
    const fromQuery = Object.fromEntries(new URLSearchParams(from ?? ''));
    const libraryHref = `/library?${new URLSearchParams({ ...fromQuery, locale })}`;
    backHref = libraryHref;
    const q = await fetchQuizByIdServer(locale, id);
    const { category: c, kind: k, signal: g, level: l } = fromQuery;
    const next = q ? await fetchNextQuizServer(q.number, { category: c, kind: k, signal: g, level: l }) : null;
    questions = q ? [q] : [];
    mode = {
      kind: 'single',
      libraryHref,
      nextHref: next ? `/train?${new URLSearchParams({ locale, id: next.id, ...(from ? { from } : {}) })}` : null,
    };
  } else {
    // With ?set= (e.g. just switched language) → reload that exact set; otherwise the server draws a new round.
    const res = await fetchQuizServer(locale, set ? { ...filter, ids: set } : filter);
    questions = res.items;
    mode = { kind: 'set', filter, remaining: res.remaining };
  }
  const initialIndex = set ? Math.max(0, (Number.parseInt(pos ?? '1', 10) || 1) - 1) : 0;

  return (
    <main className={s.main}>
      {/* Visually hidden heading — for screen readers / SEO only. */}
      <h1 className={s.srOnly}>{questions.length === 1 && id ? (questions[0].title ?? t.title) : t.title}</h1>

      <div className={s.setBar}>
        <Link href={backHref} className={s.setBack}>
          <ChevronLeft size={18} aria-hidden />
          {id ? t.backToLibrary : t.changeSet}
        </Link>
        {id && questions[0] ? (
          <span className={s.setChips}>
            <span className={s.setChip}>
              <Hash size={14} aria-hidden />
              {questions[0].seq}
            </span>
          </span>
        ) : (
          <SetLabel filter={filter} facets={facets} locale={locale} />
        )}
        <span className={s.setBarEnd}>
          <HandbookButton locale={locale} label={t.handbook} />
        </span>
      </div>

      {questions.length === 0 ? (
        <p className={s.empty}>{t.noMatch}</p>
      ) : (
        <TrainRunner
          key={id ?? JSON.stringify(filter)}
          questions={questions}
          locale={locale}
          isGuest={!me}
          isAdmin={me?.role === 'admin'}
          mode={mode}
          initialIndex={initialIndex}
        />
      )}
    </main>
  );
}

/** Label for the current set (topic / channel / signal / difficulty / random). */
function SetLabel({ filter, facets, locale }: { filter: QuizFilter; facets: Facets | null; locale: Locale }) {
  const t = TRAIN_T[locale];
  const parts: { key: string; icon: ReactNode; label: string }[] = [];
  if (filter.kind) {
    parts.push({ key: 'kind', icon: <KindIcon kind={filter.kind} />, label: t.kinds[filter.kind] ?? filter.kind });
  }
  if (filter.category) {
    const name = facets?.categories.find((c) => c.code === filter.category)?.name ?? filter.category;
    parts.push({ key: 'cat', icon: <CategoryIcon code={filter.category} size={16} />, label: name });
  }
  if (filter.signal) {
    const name = facets?.signals.find((g) => g.code === filter.signal)?.name ?? filter.signal;
    parts.push({ key: 'sig', icon: <Tag size={16} aria-hidden />, label: `${name} ${t.filterSignalNote}` });
  }
  const level = Number(filter.level);
  if (level >= 1 && level <= 3) {
    parts.push({ key: 'lvl', icon: <Gauge size={16} aria-hidden />, label: t.difficulty[level - 1] });
  }
  if (parts.length === 0) {
    parts.push({ key: 'rnd', icon: <Shuffle size={16} aria-hidden />, label: t.filterRandom });
  }
  return (
    <span className={s.setChips}>
      {parts.map((p) => (
        <span key={p.key} className={s.setChip}>
          {p.icon}
          {p.label}
        </span>
      ))}
    </span>
  );
}
