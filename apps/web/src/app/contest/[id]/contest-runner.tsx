'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleAlert, LoaderCircle, Swords, Timer } from 'lucide-react';
import {
  answerContest,
  ApiError,
  fetchContestCurrent,
  type ContestCurrent,
  type Locale,
} from '@/lib/api';
import { CONTEST_T } from '@/lib/i18n';
import { QuizInteractive } from '../../train/quiz-interactive';
import { PlayerBar, QuizInfo } from '../../train/player-frame';
import ts from '../../train/train.module.css';
import s from '../contest.module.css';

type Open = Extract<ContestCurrent, { finished: false }>;

/**
 * Runs a contest round. The server serves each question exactly once: asking again (reload, back,
 * reopened link) skips it — so this component asks for the current question ONCE per question,
 * guarded against StrictMode's double effects, and never on a language switch.
 */
export function ContestRunner({ id, locale }: { id: string; locale: Locale }) {
  const t = CONTEST_T[locale];
  const router = useRouter();
  const [current, setCurrent] = useState<Open | null>(null);
  const [skipped, setSkipped] = useState<'forfeit' | 'timeout' | undefined>();
  const [error, setError] = useState<'load' | 'notFound' | null>(null);
  // Local deadline (ms) measured from when the question arrived — immune to clock skew; the server
  // allows a few seconds of grace on top.
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const started = useRef(false);
  const busy = useRef(false);
  const resultHref = `/contest/${id}/result?locale=${locale}`;

  const load = useCallback(async () => {
    busy.current = true;
    setError(null);
    try {
      const c = await fetchContestCurrent(id);
      setSkipped(c.skipped);
      if (c.finished) {
        router.replace(resultHref);
        return;
      }
      setCurrent(c);
      setDeadline(Date.now() + c.itemSeconds * 1000);
      setNow(Date.now());
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? 'notFound' : 'load');
    } finally {
      busy.current = false;
    }
  }, [id, resultHref, router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void load();
  }, [load]);

  // Countdown; at zero ask for the next question (the server closes this one as timed out).
  useEffect(() => {
    if (!current) return;
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(tick);
  }, [current]);
  const secondsLeft = current ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
  useEffect(() => {
    if (current && secondsLeft === 0 && !busy.current) void load();
  }, [current, secondsLeft, load]);

  // Leaving mid-question skips it — warn first.
  useEffect(() => {
    if (!current) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = t.leaveWarning;
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [current, t.leaveWarning]);

  const submit = async (answeredScam: boolean, signals: string[], spots: string[]) => {
    if (!current || busy.current) return;
    busy.current = true;
    try {
      const r = await answerContest(id, {
        position: current.position,
        answeredScam,
        selectedSignals: signals,
        selectedSpots: spots,
      });
      busy.current = false;
      if (r.finished) {
        setCurrent(null);
        router.replace(resultHref);
      } else {
        await load();
      }
    } catch (e) {
      busy.current = false;
      // The question was already closed (time ran out) → just move on.
      if (e instanceof ApiError && e.status === 409) await load();
      else throw e;
    }
  };

  if (error) {
    return (
      <div className={s.loading}>
        <p>
          {error === 'notFound' ? t.notFound : t.loadError}{' '}
          <Link href={`/contest?locale=${locale}`}>{t.backToContest}</Link>
        </p>
      </div>
    );
  }
  if (!current) {
    return (
      <div className={s.loading}>
        <LoaderCircle size={28} className={ts.spin} aria-hidden />
      </div>
    );
  }

  const q = current.question;
  return (
    <>
      {/* Top bar like /train: what this is · brand handbook (a drawer — doesn't leave the page). */}
      <PlayerBar locale={locale}>
        <span className={ts.setChips}>
          <span className={ts.setChip}>
            <Swords size={14} aria-hidden />
            {t.title}
          </span>
        </span>
      </PlayerBar>

      <section className={ts.card}>
        <QuizInteractive
          key={current.position}
          q={q}
          locale={locale}
          header={
            <QuizInfo
              q={q}
              locale={locale}
              notice={
                skipped && (
                  <p className={s.notice} role="status">
                    <CircleAlert size={18} aria-hidden />
                    {skipped === 'timeout' ? t.skippedTimeout : t.skippedForfeit}
                  </p>
                )
              }
            />
          }
          contest={{ submit, label: t.submit, busyLabel: t.submitting }}
        />
      </section>

      {/* Bottom bar like /train's pager: progress (no going back, no right/wrong) · time left. */}
      <div className={ts.pager}>
        <span className={s.timerSpacer} aria-hidden />
        <div className={ts.progressRow}>
          <div
            className={ts.segments}
            role="progressbar"
            aria-label={t.item(current.position + 1, current.total)}
            aria-valuemin={0}
            aria-valuemax={current.total}
            aria-valuenow={current.position + 1}
          >
            {Array.from({ length: current.total }, (_, i) => (
              <span
                key={i}
                className={[
                  ts.seg,
                  s.segStatic,
                  i < current.position ? s.segDone : '',
                  i === current.position ? ts.segCurrent : '',
                ].join(' ')}
              />
            ))}
          </div>
          <span className={ts.counter}>
            {t.item(current.position + 1, current.total)}
          </span>
        </div>
        <span
          className={`${s.timer} ${secondsLeft <= 10 ? s.timerLow : ''}`}
          aria-live="off"
        >
          <Timer size={18} aria-hidden />
          {t.timeLeft(secondsLeft)}
        </span>
      </div>
    </>
  );
}
