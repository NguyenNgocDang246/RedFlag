'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Search, X } from 'lucide-react';
import type { Facets, LibraryQuery, Locale } from '@/lib/api';
import { LIBRARY_T, TRAIN_T } from '@/lib/i18n';
import { SelectInput } from '@/components/select-input';
import s from './library.module.css';

/**
 * Library filter bar: changes update the URL immediately (server re-renders),
 * resetting to page 1 on filter change. Search submits on Enter / Search button.
 */
export function LibraryFilters({
  locale,
  query,
  facets,
  showStatus,
}: {
  locale: Locale;
  query: LibraryQuery;
  facets: Facets | null;
  showStatus: boolean;
}) {
  const t = LIBRARY_T[locale];
  const tt = TRAIN_T[locale];
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(query.q ?? '');

  const push = (patch: Partial<LibraryQuery>) => {
    const next: Record<string, string> = { locale };
    for (const [k, v] of Object.entries({ ...query, ...patch, page: undefined }))
      if (v) next[k] = v;
    router.push(`${pathname}?${new URLSearchParams(next)}`);
  };
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    push({ q: q.trim() || undefined });
  };

  const sort = query.sort ?? 'number';
  const dir = query.dir ?? (sort === 'newest' ? 'desc' : 'asc');
  const active = Boolean(
    query.category ||
    query.kind ||
    query.signal ||
    query.level ||
    query.status ||
    query.q,
  );

  return (
    <div className={s.filters}>
      <form className={s.searchForm} onSubmit={onSearch} role="search">
        <label className={s.search}>
          <Search size={18} aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.search}
            aria-label={t.search}
          />
        </label>
        <button type="submit" className="btn btn-secondary">
          {t.searchBtn}
        </button>
      </form>

      <div className={s.selects}>
        <div className={s.filterGrid}>
          <Select
            label={t.allChannels}
            value={query.kind}
            onChange={(v) => push({ kind: v })}
          >
            {(facets?.kinds ?? []).map((k) => (
              <option key={k.code} value={k.code}>
                {tt.kinds[k.code] ?? k.code}
              </option>
            ))}
          </Select>
          <Select
            label={t.allTopics}
            value={query.category}
            onChange={(v) => push({ category: v })}
          >
            {(facets?.categories ?? []).map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            label={t.allSigns}
            value={query.signal}
            onChange={(v) => push({ signal: v })}
          >
            {(facets?.signals ?? []).map((g) => (
              <option key={g.code} value={g.code}>
                {g.name}
              </option>
            ))}
          </Select>
          <Select
            label={t.allLevels}
            value={query.level}
            onChange={(v) => push({ level: v })}
          >
            {[1, 2, 3].map((l) => (
              <option key={l} value={String(l)}>
                {tt.difficulty[l - 1]}
              </option>
            ))}
          </Select>
          {showStatus && (
            <Select
              label={t.allStatus}
              value={query.status}
              onChange={(v) => push({ status: v })}
            >
              {(['todo', 'attempted', 'solved'] as const).map((st) => (
                <option key={st} value={st}>
                  {t.status[st]}
                </option>
              ))}
            </Select>
          )}
        </div>

        <span className={s.sortGroup}>
          <SelectInput
            variant="pill"
            fit
            label={t.sortBy}
            hideLabel
            className={s.select}
            value={sort}
            onChange={(v) => push({ sort: v, dir: undefined })}
            options={(['number', 'level', 'newest'] as const).map((k) => ({
              value: k,
              label: `${t.sortBy}: ${t.sort[k]}`,
            }))}
          />
          <button
            type="button"
            className={s.dirBtn}
            onClick={() =>
              push({ sort: query.sort, dir: dir === 'asc' ? 'desc' : 'asc' })
            }
            aria-label={dir === 'asc' ? t.asc : t.desc}
            title={dir === 'asc' ? t.asc : t.desc}
          >
            {dir === 'asc' ? (
              <ArrowUpNarrowWide size={18} aria-hidden />
            ) : (
              <ArrowDownWideNarrow size={18} aria-hidden />
            )}
          </button>
        </span>

        {active && (
          <button
            type="button"
            className={s.reset}
            onClick={() => {
              setQ('');
              router.push(
                `${pathname}?${new URLSearchParams({ locale, ...(query.sort ? { sort: query.sort } : {}) })}`,
              );
            }}
          >
            <X size={16} aria-hidden />
            {t.reset}
          </button>
        )}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  children: ReactNode;
}) {
  return (
    <SelectInput
      variant="pill"
      label={label}
      hideLabel
      placeholder={label}
      active={Boolean(value)}
      value={value}
      onChange={(v) => onChange(v || undefined)}
    >
      {children}
    </SelectInput>
  );
}
