import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AppWindow,
  ArrowRight,
  Eye,
  Globe,
  Lightbulb,
  Mail,
  MessageSquare,
  MessagesSquare,
  MousePointerClick,
  QrCode,
  Repeat2,
  ShieldCheck,
} from 'lucide-react';
import type { Locale } from '@/lib/api';
import { HOME_T } from '@/lib/i18n';
import { fetchMeServer } from '@/lib/server-api';
import { HeroDemo } from './hero-demo';
import s from './home.module.css';

type Search = { searchParams: Promise<{ locale?: string }> };

const pickLocale = (raw?: string): Locale => (raw === 'vi' ? 'vi' : 'en');

const CHANNEL_ICONS = [Mail, MessageSquare, MessagesSquare, Globe, QrCode, AppWindow];
const STEP_ICONS = [Eye, MousePointerClick, Lightbulb];

export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const t = HOME_T[pickLocale((await searchParams).locale)];
  return { title: t.metaTitle, description: t.metaDesc };
}

/**
 * Home: get users into a simulated scenario as early as possible (R10) —
 * a playable demo in the hero, every CTA leads to /train. Everyday wording (R9).
 */
export default async function HomePage({ searchParams }: Search) {
  const locale = pickLocale((await searchParams).locale);
  const t = HOME_T[locale];
  // Signed in: no sign-up pitch, point to the practice picker.
  const me = await fetchMeServer();
  // Straight into a random round (/train without kind → the server shuffles).
  const trainHref = `/train?locale=${locale}&limit=10`;

  return (
    <div className={s.page}>
      {/* ── Hero ── */}
      <section className={s.heroWrap}>
        <div className={s.heroBg} aria-hidden />
        <div className={s.hero}>
          <div className={s.heroText}>
            <p className={s.eyebrow}>
              <ShieldCheck size={16} aria-hidden />
              {t.eyebrow}
            </p>
            <h1 className={s.headline}>
              {t.headlineA} <span className={s.highlight}>{t.headlineB}</span>
            </h1>
            <p className={s.sub}>{t.sub}</p>
            <div className={s.ctaRow}>
              <Link href={trainHref} className="btn btn-primary btn-lg">
                {t.cta}
                <ArrowRight size={20} aria-hidden />
              </Link>
              {me ? (
                <Link href={`/practice?locale=${locale}`} className="btn btn-secondary btn-lg">
                  {t.ctaSecondaryUser}
                </Link>
              ) : (
                <Link href={`/register?locale=${locale}`} className="btn btn-secondary btn-lg">
                  {t.ctaSecondary}
                </Link>
              )}
            </div>
            <div className={s.heroNote}>
              <span className={s.heroNoteIcon}>
                <ShieldCheck size={22} aria-hidden />
              </span>
              <div>
                <p className={s.heroNoteTitle}>{t.noteTitle}</p>
                <p className={s.heroNoteBody}>{t.noteBody}</p>
              </div>
            </div>
            <div className={s.heroNote}>
              <span className={s.heroNoteIcon}>
                <Repeat2 size={22} aria-hidden />
              </span>
              <div>
                <p className={s.heroNoteTitle}>{t.note2Title}</p>
                <p className={s.heroNoteBody}>{t.note2Body}</p>
              </div>
            </div>
          </div>
          <HeroDemo locale={locale} />
        </div>
      </section>

      {/* ── Channels ── */}
      <section className={s.channels}>
        <p className={s.channelsTitle}>{t.channelsTitle}</p>
        <ul className={s.chips}>
          {t.channels.map((name, i) => {
            const Icon = CHANNEL_ICONS[i];
            return (
              <li key={name} className={s.chip}>
                <Icon size={18} aria-hidden />
                {name}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── How it works ── */}
      <section className={s.section}>
        <div className={s.sectionHead}>
          <span className={s.kicker}>{t.howEyebrow}</span>
          <h2 className={s.h2}>{t.howTitle}</h2>
        </div>
        <ol className={s.steps}>
          {t.steps.map((step, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <li key={i} className={s.step}>
                <div className={s.stepTop}>
                  <span className={s.stepIcon}>
                    <Icon size={22} aria-hidden />
                  </span>
                  <h3>{step.title}</h3>
                </div>
                <p>{step.body}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── Final CTA ── */}
      <section className={s.final}>
        <div className={s.finalCard}>
          <h2>{me ? t.finalTitleUser : t.finalTitle}</h2>
          <p>{me ? t.finalSubUser : t.finalSub}</p>
          <Link href={trainHref} className={`btn btn-lg ${s.finalBtn}`}>
            {t.cta}
            <ArrowRight size={20} aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  );
}
