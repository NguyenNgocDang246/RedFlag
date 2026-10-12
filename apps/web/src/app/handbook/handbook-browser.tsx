'use client';

import { useId, useMemo, useState, type ComponentType } from 'react';
import { Globe, Mail, MessageSquare, Phone, Search, Smartphone, Users } from 'lucide-react';
import type { Brand, Locale } from '@/lib/api';
import { HANDBOOK_T } from '@/lib/i18n';
import { CategoryIcon } from '../train/category-icon';
import s from './handbook.module.css';

const FIELDS: { key: keyof Brand; icon: ComponentType<{ size?: number; 'aria-hidden'?: boolean }> }[] = [
  { key: 'websites', icon: Globe },
  { key: 'emailDomains', icon: Mail },
  { key: 'smsSenders', icon: MessageSquare },
  { key: 'hotlines', icon: Phone },
  { key: 'apps', icon: Smartphone },
  { key: 'socialPages', icon: Users },
];

const haystack = (b: Brand) =>
  [b.name, b.code, ...b.websites, ...b.emailDomains, ...b.smsSenders, ...b.hotlines, ...b.apps, ...b.socialPages]
    .join(' ')
    .toLowerCase();

/**
 * Brand handbook: search box + brands grouped by topic.
 * Shared by the in-quiz drawer and the /handbook page. Never highlights the brand
 * of the current quiz — learners look it up themselves, like in real life.
 */
export function HandbookBrowser({
  brands,
  locale,
  autoFocus = false,
}: {
  brands: Brand[];
  locale: Locale;
  autoFocus?: boolean;
}) {
  const t = HANDBOOK_T[locale];
  const [query, setQuery] = useState('');
  const searchId = useId();

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const found = q ? brands.filter((b) => haystack(b).includes(q)) : brands;
    const map = new Map<string, { code: string | null; name: string; brands: Brand[] }>();
    for (const b of found) {
      const key = b.category?.code ?? '';
      if (!map.has(key)) map.set(key, { code: b.category?.code ?? null, name: b.category?.name ?? t.other, brands: [] });
      map.get(key)!.brands.push(b);
    }
    return [...map.values()];
  }, [brands, query, t.other]);

  return (
    <div className={s.browser}>
      <label htmlFor={searchId} className={s.search}>
        <Search size={18} aria-hidden />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          aria-label={t.search}
          autoFocus={autoFocus}
          autoComplete="off"
        />
      </label>
      <p className={s.note}>{t.fictional}</p>

      {groups.length === 0 ? (
        <p className={s.empty}>{t.empty}</p>
      ) : (
        groups.map((g) => (
          <section key={g.code ?? '_'} className={s.group}>
            <h3 className={s.groupTitle}>
              {g.code && <CategoryIcon code={g.code} size={16} />}
              {g.name}
            </h3>
            <ul className={s.cards}>
              {g.brands.map((b) => (
                <li key={b.code} className={s.card}>
                  <div className={s.cardHead}>
                    <span className={s.brandName}>{b.name}</span>
                    {b.description && <p className={s.brandDesc}>{b.description}</p>}
                  </div>
                  <dl className={s.fields}>
                    {FIELDS.filter(({ key }) => (b[key] as string[]).length > 0).map(({ key, icon: Icon }) => (
                      <div key={key} className={s.field}>
                        <dt>
                          <Icon size={15} aria-hidden />
                          {t.fields[key]}
                        </dt>
                        <dd>
                          {(b[key] as string[]).map((v) => (
                            <code key={v} className={s.value}>
                              {v}
                            </code>
                          ))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
