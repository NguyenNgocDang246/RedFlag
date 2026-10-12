import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CircleCheck,
  CircleX,
  ShieldAlert,
  ShieldOff,
  Target,
  Timer,
  Trophy,
} from 'lucide-react';
import { IconHeading } from '@/components/icon-heading';
import type { ContestReviewItem, Locale } from '@/lib/api';
import { CONTEST_T, TRAIN_T } from '@/lib/i18n';
import { fetchContestResultServer } from '@/lib/server-api';
import { KindIcon } from '../../../train/kind-icon';
import { QuizReview } from '../../../train/quiz-interactive';
import { QuizInfo } from '../../../train/player-frame';
import s from '../../contest.module.css';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string }>;
};

const pickLocale = (raw?: string): Locale => (raw === 'vi' ? 'vi' : 'en');

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const t = CONTEST_T[pickLocale((await searchParams).locale)];
  return { title: `${t.resultTitle} - RedFlag`, robots: { index: false } };
}

/** Summary of a finished round: score, signs to work on, and every situation explained. */
export default async function ContestResultPage({ params, searchParams }: Props) {
  const [{ id }, { locale: raw }] = await Promise.all([params, searchParams]);
  const locale = pickLocale(raw);
  const t = CONTEST_T[locale];
  const r = await fetchContestResultServer(locale, id);

  if (!r) {
    return (
      <main className={s.main}>
        <p className={s.empty}>
          {t.notFound} <Link href={`/contest?locale=${locale}`}>{t.backToContest}</Link>
        </p>
      </main>
    );
  }

  const ratio = r.maxScore ? r.score / r.maxScore : 0;
  const weak = r.signals.filter((g) => g.missed > 0);
  const strong = r.signals.filter((g) => g.missed === 0 && g.spotted > 0);
  const practiceHref = (signal: string) =>
    `/train?${new URLSearchParams({ locale, signal })}`;

  return (
    <main className={s.main}>
      <header className={s.head}>
        <IconHeading
          icon={Trophy}
          title={t.resultTitle}
          sub={ratio >= 0.7 ? t.great : t.good}
        />
      </header>

      <section className={s.scoreCard}>
        <div>
          <div className={s.scoreBig}>{Math.round(ratio * 100)}%</div>
          <div className={s.scoreSub}>{t.score(r.score, r.maxScore)}</div>
        </div>
        <ul className={s.stats}>
          <li className={`${s.stat} ${s.statOk}`}>
            <CircleCheck size={18} aria-hidden />
            {t.correctCount(r.correct, r.total)}
          </li>
          {r.missedScams > 0 && (
            <li className={`${s.stat} ${s.statBad}`}>
              <ShieldAlert size={18} aria-hidden />
              {t.missedScams(r.missedScams)}
            </li>
          )}
          {r.falseAlarms > 0 && (
            <li className={`${s.stat} ${s.statWarn}`}>
              <ShieldOff size={18} aria-hidden />
              {t.falseAlarms(r.falseAlarms)}
            </li>
          )}
        </ul>
        <div className={s.actions}>
          <Link href={`/contest?locale=${locale}`} className="btn btn-primary">
            {t.again}
            <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
      </section>

      {weak.length > 0 && (
        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t.weakTitle}</h2>
          <ul className={s.signs}>
            {weak.map((g) => (
              <li key={g.code}>
                <Link
                  href={practiceHref(g.code)}
                  className={`${s.sign} ${s.signWeak}`}
                  title={t.practiceSign}
                >
                  <Target size={16} aria-hidden />
                  {g.name}
                  <span className={s.signCount}>
                    {g.spotted}/{g.spotted + g.missed}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {strong.length > 0 && (
        <section className={s.section}>
          <h2 className={s.sectionTitle}>{t.strongTitle}</h2>
          <ul className={s.signs}>
            {strong.map((g) => (
              <li key={g.code} className={`${s.sign} ${s.signStrong}`}>
                <CircleCheck size={16} aria-hidden />
                {g.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={s.section}>
        <h2 className={s.sectionTitle}>{t.reviewTitle}</h2>
        {r.items.map((it) => (
          <ReviewItem key={it.position} it={it} locale={locale} />
        ))}
      </section>
    </main>
  );
}

function ReviewItem({ it, locale }: { it: ContestReviewItem; locale: Locale }) {
  const t = CONTEST_T[locale];
  const tt = TRAIN_T[locale];
  const q = it.question;
  const ok = it.outcome === 'answered' && it.review.classifyCorrect;
  return (
    <details className={s.reviewItem}>
      <summary className={s.reviewSummary}>
        <span className={s.reviewNum}>{it.position + 1}</span>
        <KindIcon kind={q.kind} />
        <span className={s.reviewTitle}>{q.title ?? tt.kinds[q.kind] ?? q.kind}</span>
        <span className={`${s.reviewStatus} ${ok ? s.statOk : s.statBad}`}>
          {it.outcome === 'timeout' ? (
            <Timer size={16} aria-hidden />
          ) : ok ? (
            <CircleCheck size={16} aria-hidden />
          ) : (
            <CircleX size={16} aria-hidden />
          )}
          {t.outcome[it.outcome] || (ok ? tt.statusOk : tt.statusBad)} ·{' '}
          {t.points(it.points, it.maxPoints)}
        </span>
      </summary>
      <div className={s.reviewBody}>
        <QuizReview
          q={q}
          locale={locale}
          selected={it.selectedSpots.length ? it.selectedSpots : it.selectedSignals}
          result={it.review}
          header={<QuizInfo q={q} locale={locale} />}
        />
      </div>
    </details>
  );
}
