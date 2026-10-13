'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Library,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { fetchQuizSet, type Locale, type QuizFilter, type QuizQuestion } from '@/lib/api';
import { TRAIN_T } from '@/lib/i18n';
import { KindIcon } from './kind-icon';
import { QuizInteractive } from './quiz-interactive';
import { QuizInfo } from './player-frame';
import s from './train.module.css';

type Outcome = 'ok' | 'bad' | undefined;

/** Questions per "Continue" round (matches the API default). */
const SET_SIZE = 10;

/**
 * How the runner ends:
 * - `set`: a random round by filter → "Continue 10 more" (skipping questions seen this session).
 * - `single`: one question opened from the library → "Back to library" / "Next question".
 */
export type RunnerMode =
  | { kind: 'set'; filter: QuizFilter; remaining: number }
  | { kind: 'single'; libraryHref: string; nextHref: string | null };

/**
 * One quiz at a time (paged): `<` / `>` to navigate.
 * All quizzes are pre-rendered (hidden when not shown) so going back keeps the answers,
 * and the content is in the HTML for SEO.
 */
export function TrainRunner({
  questions: initialQuestions,
  locale,
  isGuest,
  mode,
  initialIndex = 0,
  isAdmin = false,
}: {
  questions: QuizQuestion[];
  locale: Locale;
  isGuest: boolean;
  mode: RunnerMode;
  /** Shows an "Edit quiz" button linking to the admin editor. */
  isAdmin?: boolean;
  /** Question position when reopening a set (e.g. after switching language). */
  initialIndex?: number;
}) {
  const t = TRAIN_T[locale];
  const [questions, setQuestions] = useState(initialQuestions);
  const [remaining, setRemaining] = useState(mode.kind === 'set' ? mode.remaining : 0);
  // Every question seen this session — sent as `exclude` so the next round doesn't repeat.
  const [seen, setSeen] = useState(() => initialQuestions.map((q) => q.id));
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const total = questions.length;
  const [index, setIndex] = useState(() => Math.min(Math.max(initialIndex, 0), total));
  const [outcomes, setOutcomes] = useState<Outcome[]>(() => Array(total).fill(undefined));
  const [round, setRound] = useState(0); // bump to restart from scratch (remounts the quizzes)
  const topRef = useRef<HTMLDivElement>(null);
  const done = index >= total;

  // Language switch: the server returns the same set in the new language → only swap content,
  // keeping the position and given answers.
  useEffect(() => {
    setQuestions((cur) =>
      cur.length === initialQuestions.length && cur.every((q, i) => q.id === initialQuestions[i].id)
        ? initialQuestions
        : cur,
    );
  }, [initialQuestions]);

  // Random round: write the current set + position to the URL (no history entry) so switching
  // language or reloading keeps the same quizzes instead of drawing a new set.
  useEffect(() => {
    if (mode.kind !== 'set') return;
    const url = new URL(window.location.href);
    url.searchParams.set('set', questions.map((q) => q.id).join(','));
    url.searchParams.set('q', String(Math.min(index, questions.length - 1) + 1));
    window.history.replaceState(window.history.state, '', url);
  }, [mode.kind, questions, index]);

  const go = useCallback(
    (i: number) => {
      setIndex(Math.min(Math.max(i, 0), total));
      const top = topRef.current;
      if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ behavior: 'smooth' });
    },
    [total],
  );

  /** New round: `fresh` = restart the set from scratch (forget seen questions). */
  const loadSet = async (fresh: boolean) => {
    if (mode.kind !== 'set') return;
    setLoading(true);
    setLoadError(false);
    try {
      const next = await fetchQuizSet(locale, mode.filter, fresh ? [] : seen);
      if (next.items.length === 0) {
        setRemaining(0);
        return;
      }
      setQuestions(next.items);
      setRemaining(next.remaining);
      setSeen((cur) => (fresh ? [] : cur).concat(next.items.map((q) => q.id)));
      setOutcomes(Array(next.items.length).fill(undefined));
      setRound((r) => r + 1);
      setIndex(0);
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  // ← → keys navigate (ignored while typing in an input).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index]);

  const record = (i: number) => (correct: boolean) =>
    setOutcomes((cur) => cur.map((o, j) => (j === i ? (correct ? 'ok' : 'bad') : o)));

  const restart = () => {
    setOutcomes(Array(total).fill(undefined));
    setRound((r) => r + 1);
    go(0);
  };

  const answered = outcomes.filter(Boolean).length;
  const correct = outcomes.filter((o) => o === 'ok').length;

  return (
    <div className={s.runner} ref={topRef}>
      {questions.map((q, i) => (
        <section key={`${round}-${q.id}`} className={s.card} hidden={i !== index} aria-hidden={i !== index}>
          <QuizInteractive
            q={q}
            locale={locale}
            onResult={record(i)}
            header={<QuizInfo q={q} locale={locale} isAdmin={isAdmin} />}
          />
        </section>
      ))}

      {done && (
        <Summary
          locale={locale}
          questions={questions}
          outcomes={outcomes}
          correct={correct}
          answered={answered}
          isGuest={isGuest}
          onJump={go}
          onRestart={restart}
          next={
            mode.kind === 'single' ? (
              <>
                {mode.nextHref && (
                  <Link href={mode.nextHref} className="btn btn-primary">
                    {t.nextInLibrary}
                    <ArrowRight size={18} aria-hidden />
                  </Link>
                )}
                <Link href={mode.libraryHref} className="btn btn-secondary">
                  <Library size={18} aria-hidden />
                  {t.backToLibrary}
                </Link>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => loadSet(remaining === 0)}
                disabled={loading}
              >
                {loading ? (
                  <LoaderCircle size={18} className={s.spin} aria-hidden />
                ) : remaining === 0 ? (
                  <RotateCcw size={18} aria-hidden />
                ) : null}
                {loading ? t.loadingSet : remaining === 0 ? t.startOver : t.continueSet(Math.min(SET_SIZE, remaining))}
                {!loading && remaining > 0 && <ArrowRight size={18} aria-hidden />}
              </button>
            )
          }
          note={
            loadError ? t.loadError : mode.kind === 'set' && remaining === 0 && !isGuest ? t.setExhausted : null
          }
        />
      )}

      {/* Navigation: < Prev · progress bar · Next > */}
      <nav className={s.pager}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => go(index - 1)}
          disabled={index === 0}
        >
          <ChevronLeft size={20} aria-hidden />
          <span className={s.pagerLabel}>{t.prev}</span>
        </button>

        {/* Progress bar: one tick per quiz, click to jump to it. */}
        <div className={s.progressRow}>
          <div className={s.segments} role="tablist" aria-label={t.progressLabel}>
            {questions.map((q, i) => (
              <button
                key={q.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`${i + 1}`}
                className={[
                  s.seg,
                  outcomes[i] === 'ok' ? s.segOk : outcomes[i] === 'bad' ? s.segBad : '',
                  i === index ? s.segCurrent : '',
                ].join(' ')}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <span className={s.counter}>{done ? `${answered} / ${total}` : t.item(index + 1, total)}</span>
        </div>

        {done ? (
          <span className={s.pagerSpacer} aria-hidden />
        ) : (
          <button
            type="button"
            className={`btn ${outcomes[index] ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => go(index + 1)}
          >
            <span className={s.pagerLabel}>{index === total - 1 ? t.finish : t.next}</span>
            <ChevronRight size={20} aria-hidden />
          </button>
        )}
      </nav>
    </div>
  );
}

function Summary({
  locale,
  questions,
  outcomes,
  correct,
  answered,
  isGuest,
  onJump,
  onRestart,
  next,
  note,
}: {
  locale: Locale;
  questions: QuizQuestion[];
  outcomes: Outcome[];
  correct: number;
  answered: number;
  isGuest: boolean;
  onJump: (i: number) => void;
  onRestart: () => void;
  /** Continue button (new round / next library question). */
  next: ReactNode;
  note: string | null;
}) {
  const t = TRAIN_T[locale];
  const skipped = questions.length - answered;
  // Score against the whole round: a skipped scenario counts as not correct.
  const ratio = questions.length ? correct / questions.length : 0;

  return (
    <section className={`${s.card} ${s.summary}`}>
      {/* Compact one-row header: small icon · title + score · remark */}
      <div className={s.summaryHead}>
        <span className={s.trophy}>
          <Trophy size={18} aria-hidden />
        </span>
        <div className={s.summaryText}>
          <h2 className={s.summaryTitle}>
            {t.summaryTitle}{' '}
            {answered > 0 && <span className={s.summaryScore}>{t.summaryScore(correct, questions.length)}</span>}
          </h2>
          <p className={s.summaryNote}>
            {/* Nothing answered → no score/praise, just the skipped count. */}
            {answered > 0 && (ratio === 1 ? t.perfect : ratio >= 0.7 ? t.great : t.good)}
            {skipped > 0 && `${answered > 0 ? ' ' : ''}${t.summarySkipped(skipped)}`}
          </p>
        </div>
      </div>

      <div className={s.reviewLabel}>{t.review}</div>
      <ol className={s.reviewList}>
        {questions.map((q, i) => (
          <li key={q.id}>
            <button type="button" className={s.reviewItem} onClick={() => onJump(i)}>
              <span className={s.reviewNum}>{i + 1}</span>
              <KindIcon kind={q.kind} />
              <span className={s.reviewText}>{q.title ?? t.kinds[q.kind] ?? q.kind}</span>
              {outcomes[i] === 'ok' ? (
                <span className={`${s.status} ${s.statusOk}`}>
                  <CircleCheck size={16} aria-hidden />
                  {t.statusOk}
                </span>
              ) : outcomes[i] === 'bad' ? (
                <span className={`${s.status} ${s.statusBad}`}>
                  <CircleX size={16} aria-hidden />
                  {t.statusBad}
                </span>
              ) : (
                <span className={s.status}>{t.statusSkip}</span>
              )}
            </button>
          </li>
        ))}
      </ol>

      <div className={s.summaryActions}>
        {next}
        <button type="button" className="btn btn-secondary" onClick={onRestart}>
          <RotateCcw size={18} aria-hidden />
          {t.restart}
        </button>
        {isGuest && (
          <Link href={`/register?locale=${locale}`} className="btn btn-secondary">
            <Sparkles size={18} aria-hidden />
            {t.moreCta}
          </Link>
        )}
      </div>
      {note && (
        <p className={s.summaryMore} role="status">
          {note}
        </p>
      )}
      {isGuest && <p className={s.summaryMore}>{t.moreBody}</p>}
    </section>
  );
}
