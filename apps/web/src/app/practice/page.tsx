import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Flag,
  Inbox,
  Library,
  Lock,
  Shuffle,
  Sparkles,
  Tags,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { IconHeading } from '@/components/icon-heading';
import type { Facets, Locale } from '@/lib/api';
import { PRACTICE_T, TRAIN_T } from '@/lib/i18n';
import { fetchFacetsServer, fetchMeServer } from '@/lib/server-api';
import { CategoryIcon } from '../train/category-icon';
import { KindIcon } from '../train/kind-icon';
import s from './practice.module.css';

type Search = { searchParams: Promise<{ locale?: string; level?: string }> };

const pickLocale = (raw?: string): Locale => (raw === 'vi' ? 'vi' : 'en');

/** Questions per round (matches the API default). */
const RANDOM_SIZE = 10;

export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const t = PRACTICE_T[pickLocale((await searchParams).locale)];
  return { title: t.metaTitle, description: t.subtitle };
}

/**
 * Practice picker: lists channels / topics / signals (with counts) — each links
 * to /train with the matching query; the server draws 10 random questions per round.
 * The difficulty choice (?level=) applies to all items. /train itself is only the player.
 */
export default async function PracticePage({ searchParams }: Search) {
  const params = await searchParams;
  const locale = pickLocale(params.locale);
  const t = PRACTICE_T[locale];
  const kinds = TRAIN_T[locale].kinds;
  const level = ['1', '2', '3'].includes(params.level ?? '') ? params.level : undefined;
  const [facets, me] = await Promise.all([
    fetchFacetsServer(locale, level),
    fetchMeServer(),
  ]);
  const href = (q: Record<string, string>) =>
    `/train?${new URLSearchParams({ locale, ...(level ? { level } : {}), ...q })}`;
  const randomSize = Math.min(RANDOM_SIZE, facets?.total ?? 0);

  return (
    <main className={s.main}>
      <header className={s.head}>
        <IconHeading icon={Target} title={t.title} sub={t.subtitle} />
      </header>

      {facets && <LevelPicker facets={facets} level={level} locale={locale} />}

      {!facets || facets.total === 0 ? (
        <p className={s.empty}>{t.empty}</p>
      ) : (
        <>
          {/* Random practice — the default, most prominent option */}
          <Link href={href({})} className={s.random}>
            <span className={s.randomIcon}>
              <Shuffle size={26} aria-hidden />
            </span>
            <span className={s.randomText}>
              <span className={s.randomTitle}>{t.randomTitle}</span>
              <span className={s.randomBody}>{t.randomBody(randomSize)}</span>
            </span>
            <span className={`btn btn-primary ${s.randomCta}`}>
              {t.randomCta}
              <ArrowRight size={18} aria-hidden />
            </span>
          </Link>

          <section className={s.section}>
            <SectionHead icon={Inbox} title={t.byKind} hint={t.byKindHint} />
            <ul className={s.grid}>
              {facets.kinds.map((k) => (
                <li key={k.code}>
                  <Link href={href({ kind: k.code })} className={s.tile}>
                    <span className={s.tileIcon}>
                      <KindIcon kind={k.code} size={20} />
                    </span>
                    <span className={s.tileName}>{kinds[k.code] ?? k.code}</span>
                    <span className={s.tileCount}>{t.count(k.count)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className={s.section}>
            <SectionHead icon={Tags} title={t.byCategory} hint={t.byCategoryHint} />
            <ul className={s.grid}>
              {facets.categories.map((c) => (
                <li key={c.code}>
                  <Link
                    href={href({ category: c.code })}
                    className={s.tile}
                    title={c.description}
                  >
                    <span className={s.tileIcon}>
                      <CategoryIcon code={c.code} size={20} />
                    </span>
                    <span className={s.tileName}>{c.name}</span>
                    <span className={s.tileCount}>{t.count(c.count)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className={s.section}>
            <SectionHead icon={Flag} title={t.bySignal} hint={t.bySignalHint} />
            <ul className={s.chips}>
              {facets.signals.map((g) => (
                <li key={g.code}>
                  <Link href={href({ signal: g.code })} className={s.chip}>
                    {g.name}
                    <span className={s.chipCount}>{g.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <Link href={`/library?locale=${locale}`} className={s.library}>
            <span className={s.libraryIcon}>
              <Library size={22} aria-hidden />
            </span>
            <span className={s.randomText}>
              <span className={s.libraryTitle}>{t.libraryTitle}</span>
              <span className={s.randomBody}>{t.libraryBody}</span>
            </span>
            <span className={`btn btn-secondary ${s.randomCta}`}>
              {t.libraryCta}
              <ArrowRight size={18} aria-hidden />
            </span>
          </Link>

          {!me && facets.locked > 0 && (
            <section className={s.locked}>
              <span className={s.lockedIcon}>
                <Lock size={22} aria-hidden />
              </span>
              <div className={s.lockedText}>
                <h2>{t.lockedTitle(facets.locked)}</h2>
                <p>{t.lockedBody}</p>
              </div>
              <Link href={`/register?locale=${locale}`} className="btn btn-primary">
                <Sparkles size={18} aria-hidden />
                {t.lockedCta}
              </Link>
            </section>
          )}
        </>
      )}
    </main>
  );
}

/**
 * Difficulty picker: All / Easy / Medium / Hard (hides levels with no quizzes).
 * Only shown with 2+ levels in the pool — with one level, filtering is pointless.
 */
function LevelPicker({
  facets,
  level,
  locale,
}: {
  facets: Facets;
  level?: string;
  locale: Locale;
}) {
  const t = PRACTICE_T[locale];
  const names = TRAIN_T[locale].difficulty;
  const levels = facets.levels.filter((l) => l.level >= 1 && l.level <= 3 && l.count > 0);
  if (levels.length < 2) return null;
  const href = (lv?: number) =>
    `/practice?${new URLSearchParams({ locale, ...(lv ? { level: String(lv) } : {}) })}`;
  return (
    <nav className={s.levels} aria-label={t.levelLabel}>
      <span className={s.levelsLabel}>{t.levelLabel}</span>
      <Link
        href={href()}
        className={`${s.levelChip} ${!level ? s.levelOn : ''}`}
        aria-current={!level ? 'page' : undefined}
      >
        {t.levelAll}
      </Link>
      {levels.map((l) => {
        const on = level === String(l.level);
        return (
          <Link
            key={l.level}
            href={href(l.level)}
            className={`${s.levelChip} ${on ? s.levelOn : ''}`}
            aria-current={on ? 'page' : undefined}
          >
            {names[l.level - 1]}
            <span className={s.chipCount}>{l.count}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SectionHead({
  icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
}) {
  return (
    <IconHeading
      icon={icon}
      size="section"
      title={title}
      sub={hint}
      className={s.sectionHead}
    />
  );
}
