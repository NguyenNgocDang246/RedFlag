import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CircleCheck, History, LogIn, Swords } from 'lucide-react';
import { IconHeading } from '@/components/icon-heading';
import type { Locale } from '@/lib/api';
import { CONTEST_T } from '@/lib/i18n';
import { fetchContestHistoryServer, fetchMeServer } from '@/lib/server-api';
import { CONTEST_ITEM_SECONDS, CONTEST_SIZE } from '@redflag/shared';
import { StartButton } from './start-button';
import s from './contest.module.css';

type Search = { searchParams: Promise<{ locale?: string }> };

const pickLocale = (raw?: string): Locale => (raw === 'vi' ? 'vi' : 'en');

export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const t = CONTEST_T[pickLocale((await searchParams).locale)];
  return { title: t.metaTitle, description: t.subtitle };
}

/** Contest landing: rules, start button and past rounds. Sign-in required (rounds are saved). */
export default async function ContestPage({ searchParams }: Search) {
  const locale = pickLocale((await searchParams).locale);
  const t = CONTEST_T[locale];
  const me = await fetchMeServer();
  const history = me ? await fetchContestHistoryServer() : null;
  const ruleArgs = [CONTEST_SIZE, CONTEST_ITEM_SECONDS, 0, 0];
  const date = (iso: string) =>
    new Date(iso).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  return (
    <main className={s.main}>
      <header className={s.head}>
        <IconHeading icon={Swords} title={t.title} sub={t.subtitle} />
      </header>

      <section className={s.startCard}>
        <ul className={s.rules}>
          {t.rules.map((rule, i) => (
            <li key={i} className={s.rule}>
              <CircleCheck size={20} className={s.ruleIcon} aria-hidden />
              {rule(ruleArgs[i])}
            </li>
          ))}
        </ul>
        {me ? (
          <>
            <div className={s.actions}>
              <StartButton locale={locale} />
              {history?.active && (
                <Link
                  href={`/contest/${history.active.id}?locale=${locale}`}
                  className="btn btn-secondary"
                >
                  {t.resume}
                  <ArrowRight size={18} aria-hidden />
                </Link>
              )}
            </div>
            {history?.active && <p className={s.note}>{t.resumeNote}</p>}
          </>
        ) : (
          <div className={s.actions}>
            <div>
              <strong>{t.loginTitle}</strong>
              <p className={s.note}>{t.loginBody}</p>
            </div>
            <Link
              href={`/login?locale=${locale}&next=${encodeURIComponent(`/contest?locale=${locale}`)}`}
              className="btn btn-primary"
            >
              <LogIn size={18} aria-hidden />
              {t.loginCta}
            </Link>
          </div>
        )}
      </section>

      {me && (
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <History size={18} aria-hidden /> {t.history}
          </h2>
          {!history?.items.length ? (
            <p className={s.empty}>{t.noHistory}</p>
          ) : (
            <ul className={s.history}>
              {history.items.map((h) => (
                <li key={h.id}>
                  <Link
                    href={`/contest/${h.id}/result?locale=${locale}`}
                    className={s.historyItem}
                  >
                    <span className={s.historyDate}>
                      {date(h.finishedAt ?? h.startedAt)}
                    </span>
                    <span className={s.historyScore}>{t.score(h.score, h.maxScore)}</span>
                    <ArrowRight size={16} aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
