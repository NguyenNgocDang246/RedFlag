import Link from 'next/link';
import { ArrowRight, CircleAlert, Target, TrendingUp } from 'lucide-react';
import type { Locale, Progress } from '@/lib/api';
import { CONTEST_T, ME_T } from '@/lib/i18n';
import { formatDate } from '@/lib/text';
import s from './me.module.css';

/** Most-missed signs shown. */
const WEAK_LIMIT = 5;

/** Practice + contest combined: headline numbers, signs to work on (each linking to practice), recent rounds. */
export function ProgressSection({
  progress: p,
  locale,
}: {
  progress: Progress | null;
  locale: Locale;
}) {
  const t = ME_T[locale];
  const tc = CONTEST_T[locale];
  const date = (iso: string | null) => (iso ? formatDate(iso, locale) : '');

  if (!p || p.answered === 0) {
    return (
      <section className={s.card}>
        <h1 className={s.cardTitle}>
          <TrendingUp size={20} aria-hidden /> {t.progressTitle}
        </h1>
        <p className={s.muted}>{t.noProgress}</p>
        <Link href={`/practice?locale=${locale}`} className="btn btn-primary">
          {t.startPractice}
          <ArrowRight size={18} aria-hidden />
        </Link>
      </section>
    );
  }

  const accuracy = Math.round((p.correct / p.answered) * 100);
  const weak = p.signals.filter((g) => g.missed > 0).slice(0, WEAK_LIMIT);

  return (
    <section className={s.card}>
      <h1 className={s.cardTitle}>
        <TrendingUp size={20} aria-hidden /> {t.progressTitle}
      </h1>

      <dl className={s.stats}>
        <div className={s.stat}>
          <dt>{t.statScenarios}</dt>
          <dd className={s.statValue}>{p.practice.scenarios}</dd>
        </div>
        <div className={s.stat}>
          <dt>{t.statAccuracy}</dt>
          <dd className={s.statValue}>{accuracy}%</dd>
          <dd className={s.statSub}>{t.statAccuracySub(p.correct, p.answered)}</dd>
        </div>
        <div className={s.stat}>
          <dt>{t.statContests}</dt>
          <dd className={s.statValue}>{p.contests.count}</dd>
          {p.contests.best !== null && (
            <dd className={s.statSub}>{t.statBest(p.contests.best)}</dd>
          )}
        </div>
      </dl>

      <h2 className={s.subTitle}>{t.weakTitle}</h2>
      {weak.length === 0 ? (
        <p className={s.muted}>{t.noWeak}</p>
      ) : (
        <ul className={s.weakList}>
          {weak.map((g) => {
            const total = g.spotted + g.missed;
            return (
              <li key={g.code} className={s.weakItem}>
                <span className={s.weakName}>{g.name}</span>
                <span className={s.weakBar} aria-hidden>
                  <span
                    className={s.weakFill}
                    style={{ width: `${(g.missed / total) * 100}%` }}
                  />
                </span>
                <span className={s.weakRate}>{t.weakRate(g.missed, total)}</span>
                <Link
                  href={`/train?${new URLSearchParams({ locale, signal: g.code })}`}
                  className={s.weakLink}
                >
                  <Target size={15} aria-hidden />
                  {t.practiceThis}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {p.falseAlarms > 0 && (
        <p className={s.note}>
          <CircleAlert size={18} aria-hidden />
          {t.falseAlarms(p.falseAlarms)}
        </p>
      )}

      {p.contests.recent.length > 0 && (
        <>
          <h2 className={s.subTitle}>{t.recentContests}</h2>
          <ul className={s.rows}>
            {p.contests.recent.map((c) => (
              <li key={c.id}>
                <Link href={`/contest/${c.id}/result?locale=${locale}`} className={s.row}>
                  <span className={s.rowMain}>{date(c.finishedAt)}</span>
                  <span className={s.rowStrong}>{tc.score(c.score, c.maxScore)}</span>
                  <ArrowRight size={16} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
