import type { ReactNode } from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import type { Locale, QuizQuestion } from '@/lib/api';
import { TRAIN_T } from '@/lib/i18n';
import { HandbookButton } from '../handbook/handbook-drawer';
import { QuizTags } from './quiz-tags';
import s from './train.module.css';

/**
 * Shared frame pieces of the quiz players (/train and /contest).
 * Put them inside `<main className={train.main}>` — that sets the fixed card height,
 * so the simulation column scrolls on its own.
 */

/** Top bar: what's being played (left) · brand handbook (right, a drawer — never leaves the page). */
export function PlayerBar({
  locale,
  children,
}: {
  locale: Locale;
  children?: ReactNode;
}) {
  return (
    <div className={s.setBar}>
      {children}
      <span className={s.setBarEnd}>
        <HandbookButton locale={locale} label={TRAIN_T[locale].handbook} />
      </span>
    </div>
  );
}

/** Left column header: tags (channel, topic, difficulty) + prompt. Never reveals correct signals. */
export function QuizInfo({
  q,
  locale,
  isAdmin = false,
  notice,
}: {
  q: QuizQuestion;
  locale: Locale;
  /** Shows an "Edit" link to the admin editor (new tab — progress is kept). */
  isAdmin?: boolean;
  /** Optional message above the tags. */
  notice?: ReactNode;
}) {
  const t = TRAIN_T[locale];
  return (
    <>
      {notice}
      <div className={s.infoTop}>
        <QuizTags q={q} locale={locale} />
        {isAdmin && (
          <Link
            href={`/admin/quiz/${q.id}`}
            target="_blank"
            className={s.editLink}
            title={`${t.editQuiz} #${q.number}`}
            aria-label={`${t.editQuiz} #${q.number}`}
          >
            <Pencil size={14} aria-hidden />
          </Link>
        )}
      </div>
      <h2 className={s.prompt}>{q.prompt}</h2>
    </>
  );
}
