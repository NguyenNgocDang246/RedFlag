import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookMarked, Hand, Settings2, ShieldAlert, Target } from 'lucide-react';
import type { Locale } from '@/lib/api';
import { CAUGHT_T } from '@/lib/i18n';
import { fetchCaughtServer } from '@/lib/server-api';
import s from './caught.module.css';

type Search = { searchParams: Promise<{ t?: string; locale?: string }> };

const pickLocale = (raw?: string): Locale => (raw === 'vi' ? 'vi' : 'en');

export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const t = CAUGHT_T[pickLocale((await searchParams).locale)];
  return { title: t.metaTitle, robots: { index: false } };
}

/**
 * Where a click on a simulated test email lands (Phase 4).
 *
 * No fake form is ever shown and nothing is asked of the reader (R2) — the click itself is the
 * whole measurement. The page opens by telling them they are safe, because someone who is not
 * technical may well arrive here frightened (R9), and only then explains what gave the email away.
 */
export default async function CaughtPage({ searchParams }: Search) {
  const { t: token, locale: raw } = await searchParams;
  const locale = pickLocale(raw);
  const t = CAUGHT_T[locale];
  const content = token ? await fetchCaughtServer(token, locale) : null;

  if (!content) {
    return (
      <div className={`theme-caught ${s.wrap}`}>
        <main className={s.main}>
          <h1 className={s.title}>{t.goneTitle}</h1>
          <p className={s.safe}>{t.goneBody}</p>
          <Link href={`/?locale=${locale}`} className="btn btn-primary">
            {t.goneCta}
          </Link>
        </main>
      </div>
    );
  }

  const practiceHref = content.signals[0]
    ? `/train?${new URLSearchParams({ locale, signal: content.signals[0].code })}`
    : `/practice?locale=${locale}`;

  return (
    <div className={`theme-caught ${s.wrap}`}>
      <main className={s.main}>
        <header className={s.head}>
          <span className={s.badge} aria-hidden>
            <Hand size={34} />
          </span>
          <h1 className={s.title}>{t.title}</h1>
          <p className={s.safe}>{t.safe}</p>
          <p className={s.realNote}>
            <ShieldAlert size={18} aria-hidden />
            {t.realNote}
          </p>
        </header>

        <section className={s.card}>
          <h2 className={s.cardTitle}>{t.emailTitle}</h2>
          <dl className={s.meta}>
            <dt>{t.from}</dt>
            <dd>{content.senderName}</dd>
            <dt>{t.subject}</dt>
            <dd>{content.subject}</dd>
          </dl>
        </section>

        <section className={s.card}>
          <h2 className={s.cardTitle}>{t.signsTitle}</h2>
          {content.signals.length === 0 ? (
            <p className={s.muted}>{t.noSigns}</p>
          ) : (
            <ul className={s.signs}>
              {content.signals.map((sig) => (
                <li key={sig.code} className={s.sign}>
                  <span className={s.signName}>{sig.name}</span>
                  <span className={s.signWhy}>{sig.explanation}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={s.card}>
          <h2 className={s.cardTitle}>{t.nextTitle}</h2>
          <ul className={s.tips}>
            {t.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>

        <div className={s.actions}>
          <Link href={practiceHref} className="btn btn-primary">
            <Target size={18} aria-hidden />
            {t.practiceCta}
            <ArrowRight size={18} aria-hidden />
          </Link>
          <Link href={`/handbook?locale=${locale}`} className="btn btn-secondary">
            <BookMarked size={18} aria-hidden />
            {t.handbookCta}
          </Link>
          <Link href={`/me/test?locale=${locale}`} className={s.quiet}>
            <Settings2 size={16} aria-hidden />
            {t.settingsCta}
          </Link>
        </div>
      </main>
    </div>
  );
}
