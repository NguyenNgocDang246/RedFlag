import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  CircleDot,
  Library,
  Lock,
} from 'lucide-react';
import { IconHeading } from '@/components/icon-heading';
import type { LibraryItem, LibraryQuery, Locale } from '@/lib/api';
import { LIBRARY_T, TRAIN_T } from '@/lib/i18n';
import { fetchFacetsServer, fetchLibraryServer, fetchMeServer } from '@/lib/server-api';
import { CategoryIcon } from '../train/category-icon';
import { KindIcon } from '../train/kind-icon';
import { LibraryFilters } from './library-filters';
import s from './library.module.css';

type Search = { searchParams: Promise<LibraryQuery & { locale?: string }> };

const pickLocale = (raw?: string): Locale => (raw === 'vi' ? 'vi' : 'en');

/** Keep only keys the library understands — so links (pagination, "Back to library") carry no junk. */
const KEYS = [
  'category',
  'kind',
  'signal',
  'level',
  'status',
  'q',
  'sort',
  'dir',
  'page',
] as const;

export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const t = LIBRARY_T[pickLocale((await searchParams).locale)];
  return { title: t.metaTitle, description: t.subtitle };
}

/**
 * Scenario library (LeetCode-style): all questions, filter / sort / paginate, kept in the URL.
 * No answers revealed — click a question to take it at /train?id=…
 */
export default async function LibraryPage({ searchParams }: Search) {
  const params = await searchParams;
  const locale = pickLocale(params.locale);
  const t = LIBRARY_T[locale];
  const query: LibraryQuery = Object.fromEntries(
    KEYS.filter((k) => params[k]).map((k) => [k, params[k]]),
  );
  const [page, facets, me] = await Promise.all([
    fetchLibraryServer(locale, query),
    fetchFacetsServer(locale),
    fetchMeServer(),
  ]);

  const { page: _page, ...rest } = query;
  const listHref = (p: number) =>
    `/library?${new URLSearchParams({ locale, ...rest, ...(p > 1 ? { page: String(p) } : {}) })}`;
  // Questions opened from the library remember filters + page to return to the same spot.
  const from = new URLSearchParams(query as Record<string, string>).toString();
  const itemHref = (it: LibraryItem) =>
    it.locked
      ? `/login?locale=${locale}`
      : `/train?${new URLSearchParams({ locale, id: it.id, ...(from ? { from } : {}) })}`;
  const pages = page ? Math.max(1, Math.ceil(page.total / page.pageSize)) : 1;
  const showStatus = Boolean(me);

  return (
    <main className={s.main}>
      <header className={s.head}>
        <IconHeading icon={Library} title={t.title} sub={t.subtitle} />
      </header>

      <LibraryFilters
        key={query.q ?? ''}
        locale={locale}
        query={query}
        facets={facets}
        showStatus={showStatus}
        total={page && page.items.length > 0 ? t.total(page.total) : undefined}
      />

      {!page ? (
        <p className={s.empty}>{t.error}</p>
      ) : page.items.length === 0 ? (
        <p className={s.empty}>{t.empty}</p>
      ) : (
        <>
          <div className={s.table} role="table" aria-label={t.title}>
            <div className={`${s.row} ${s.headRow}`} role="row">
              <span role="columnheader" className={s.cNum}>
                {t.colNumber}
              </span>
              <span role="columnheader" className={s.cTitle}>
                {t.colTitle}
              </span>
              <span role="columnheader" className={s.cTopic}>
                {t.colTopic}
              </span>
              <span role="columnheader" className={s.cLevel}>
                {t.colLevel}
              </span>
              {showStatus && (
                <span role="columnheader" className={s.cStatus}>
                  {t.colStatus}
                </span>
              )}
            </div>
            {page.items.map((it) => (
              <Row
                key={it.id}
                item={it}
                href={itemHref(it)}
                locale={locale}
                showStatus={showStatus}
              />
            ))}
          </div>

          {pages > 1 && (
            <nav className={s.pager} aria-label={t.pageOf(page.page, pages)}>
              {page.page > 1 ? (
                <Link href={listHref(page.page - 1)} className="btn btn-secondary btn-sm">
                  <ChevronLeft size={16} aria-hidden />
                  {t.prev}
                </Link>
              ) : (
                <span />
              )}
              <span className={s.pageOf}>{t.pageOf(page.page, pages)}</span>
              {page.page < pages ? (
                <Link href={listHref(page.page + 1)} className="btn btn-secondary btn-sm">
                  {t.next}
                  <ChevronRight size={16} aria-hidden />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </main>
  );
}

function Row({
  item,
  href,
  locale,
  showStatus,
}: {
  item: LibraryItem;
  href: string;
  locale: Locale;
  showStatus: boolean;
}) {
  const t = LIBRARY_T[locale];
  const tt = TRAIN_T[locale];
  const kindName = tt.kinds[item.kind] ?? item.kind;
  const title = item.title ?? [kindName, item.category?.name].filter(Boolean).join(' · ');
  const level = Math.min(Math.max(item.level, 1), 3);

  return (
    <Link href={href} className={`${s.row} ${item.locked ? s.rowLocked : ''}`} role="row">
      <span role="cell" className={s.cNum}>
        {item.seq}
      </span>
      <span role="cell" className={s.cTitle}>
        <span className={s.kindIcon} title={kindName}>
          <KindIcon kind={item.kind} size={16} />
        </span>
        <span className={s.titleText}>{title}</span>
        {item.locked && (
          <span className={s.lock}>
            <Lock size={13} aria-hidden />
            {t.locked}
          </span>
        )}
      </span>
      <span role="cell" className={s.cTopic}>
        {item.category && (
          <>
            <CategoryIcon code={item.category.code} size={14} />
            {item.category.name}
          </>
        )}
      </span>
      <span role="cell" className={s.cLevel} data-level={level}>
        {tt.difficulty[level - 1]}
      </span>
      {showStatus && (
        <span role="cell" className={s.cStatus}>
          <StatusIcon
            status={item.status}
            label={item.status ? t.status[item.status] : ''}
          />
        </span>
      )}
    </Link>
  );
}

function StatusIcon({ status, label }: { status: LibraryItem['status']; label: string }) {
  if (status === 'solved')
    return <CircleCheck size={18} className={s.solved} aria-label={label} />;
  if (status === 'attempted')
    return <CircleDot size={18} className={s.attempted} aria-label={label} />;
  return <CircleDashed size={18} className={s.todo} aria-label={label} />;
}
