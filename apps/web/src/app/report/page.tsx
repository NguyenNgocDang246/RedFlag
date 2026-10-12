import type { Metadata } from 'next';
import Link from 'next/link';
import { Forward, LogIn, ShieldAlert, Settings2, TriangleAlert } from 'lucide-react';
import { IconHeading } from '@/components/icon-heading';
import type { Locale } from '@/lib/api';
import { REPORT_T } from '@/lib/i18n';
import { fetchMeServer, fetchTestWarningServer } from '@/lib/server-api';
import { ReportList } from './report-list';
import s from './report.module.css';

type Search = { searchParams: Promise<{ locale?: string }> };

const pickLocale = (raw?: string): Locale => (raw === 'vi' ? 'vi' : 'en');

export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const t = REPORT_T[pickLocale((await searchParams).locale)];
  return { title: t.metaTitle, description: t.subtitle };
}

/**
 * Where a user reports a simulated test email they spotted (R1's good reflex).
 *
 * This is one of exactly two routes that reach RedFlag — the other is forwarding to the report
 * address — and the page says so, because the mail app's own "Report phishing" button goes to the
 * mail provider instead and would quietly lose the report.
 */
export default async function ReportPage({ searchParams }: Search) {
  const locale = pickLocale((await searchParams).locale);
  const t = REPORT_T[locale];
  const [me, warning] = await Promise.all([fetchMeServer(), fetchTestWarningServer(locale)]);

  return (
    <main className={s.main}>
      <header className={s.head}>
        <IconHeading icon={ShieldAlert} title={t.title} sub={t.subtitle} />
      </header>

      {me ? (
        <ReportList locale={locale} />
      ) : (
        <section className={s.card}>
          <h2 className={s.cardTitle}>{t.loginTitle}</h2>
          <p className={s.muted}>{t.loginBody}</p>
          <Link
            href={`/login?locale=${locale}&next=${encodeURIComponent(`/report?locale=${locale}`)}`}
            className="btn btn-primary"
          >
            <LogIn size={18} aria-hidden />
            {t.loginCta}
          </Link>
        </section>
      )}

      <section className={s.card}>
        <h2 className={s.cardTitle}>
          <Forward size={18} aria-hidden /> {t.forwardTitle}
        </h2>
        <p className={s.muted}>{t.forwardBody(warning?.reportAddress ?? '')}</p>
        <p className={s.warn}>
          <TriangleAlert size={18} aria-hidden />
          {t.mailAppWarning}
        </p>
      </section>

      <Link href={`/me/test?locale=${locale}`} className={s.quiet}>
        <Settings2 size={16} aria-hidden />
        {t.settingsCta}
      </Link>
    </main>
  );
}
