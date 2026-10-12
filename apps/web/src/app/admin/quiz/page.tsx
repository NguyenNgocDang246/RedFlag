'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ListChecks, Plus } from 'lucide-react';
import { IconHeading } from '@/components/icon-heading';
import { SelectInput } from '@/components/select-input';
import { EDITABLE_QUIZ_KINDS } from '@redflag/shared';
import {
  errorText,
  listCategories,
  listQuiz,
  type AdminCategory,
  type AdminQuizListItem,
  type QuizListFilter,
} from '@/lib/admin-api';
import { KindIcon } from '../../train/kind-icon';
import s from '../admin.module.css';
import { useAdmin } from '../use-admin';

export default function AdminQuizList() {
  const router = useRouter();
  const { t, locale, href } = useAdmin();
  const tq = t.quiz;
  const kindName = (k: string) => t.kinds[k] ?? k;
  const [filter, setFilter] = useState<QuizListFilter>({ page: 1, q: '' });
  const [q, setQ] = useState('');
  const [data, setData] = useState<{
    total: number;
    pageSize: number;
    items: AdminQuizListItem[];
  } | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    listQuiz(filter)
      .then(setData)
      .catch((e) => setError(errorText(e)));
  }, [filter]);

  // Search by prompt: debounce before calling the API.
  useEffect(() => {
    const h = setTimeout(
      () => setFilter((f) => (f.q === q ? f : { ...f, q, page: 1 })),
      300,
    );
    return () => clearTimeout(h);
  }, [q]);

  const set = (patch: QuizListFilter) => setFilter((f) => ({ ...f, ...patch, page: 1 }));
  const catName = new Map(
    categories.map((c) => [
      c.code,
      c.translations[locale].name || c.translations.en.name || c.code,
    ]),
  );
  // Like the library: neutral title; falls back to "channel · topic".
  const situationTitle = (it: AdminQuizListItem) =>
    it.title[locale] ||
    it.title.en ||
    it.title.vi ||
    [kindName(it.kind), it.categoryCode ? catName.get(it.categoryCode) : null]
      .filter(Boolean)
      .join(' · ');
  const page = filter.page ?? 1;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <IconHeading
        icon={ListChecks}
        title={tq.title}
        sub={tq.sub(data ? data.total : null)}
        className={s.pageHead}
        actions={
          <Link href={href('/admin/quiz/new')} className="btn btn-primary btn-sm">
            <Plus size={16} aria-hidden /> {tq.newBtn}
          </Link>
        }
      />

      <div className={s.toolbar}>
        <input
          className={`${s.input} ${s.inputSm}`}
          placeholder={tq.searchPh}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <SelectInput
          size="sm"
          fit
          aria-label={tq.cols.kind}
          placeholder={tq.allKinds}
          active={Boolean(filter.kind)}
          value={filter.kind}
          onChange={(v) => set({ kind: v || undefined })}
          options={EDITABLE_QUIZ_KINDS.map((k) => ({ value: k, label: kindName(k) }))}
        />
        <SelectInput
          size="sm"
          fit
          aria-label={tq.cols.category}
          placeholder={tq.allCategories}
          active={Boolean(filter.category)}
          value={filter.category}
          onChange={(v) => set({ category: v || undefined })}
          options={[
            { value: '__none', label: tq.noCategory },
            ...categories.map((c) => ({ value: c.code, label: catName.get(c.code) })),
          ]}
        />
        <SelectInput
          size="sm"
          fit
          aria-label={tq.cols.status}
          placeholder={tq.allStatus}
          active={Boolean(filter.status)}
          value={filter.status}
          onChange={(v) => set({ status: v || undefined })}
          options={[
            { value: 'published', label: tq.published },
            { value: 'draft', label: tq.draft },
          ]}
        />
      </div>

      {error && <div className={s.alert}>{error}</div>}

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>{tq.cols.situation}</th>
              <th className={s.hideSm}>{tq.cols.kind}</th>
              <th className={s.hideSm}>{tq.cols.category}</th>
              <th className={s.hideSm}>{tq.cols.answer}</th>
              <th>{tq.cols.status}</th>
              <th className={s.hideSm}>{tq.cols.attempts}</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((it) => (
              <tr
                key={it.id}
                className={s.rowLink}
                onClick={() => router.push(href(`/admin/quiz/${it.id}`))}
              >
                <td className={s.muted}>{it.number}</td>
                <td className={s.clip}>
                  <span className={s.situation}>
                    <span className={s.kindIcon} title={kindName(it.kind)}>
                      <KindIcon kind={it.kind} size={16} />
                    </span>
                    <Link
                      href={href(`/admin/quiz/${it.id}`)}
                      onClick={(e) => e.stopPropagation()}
                      className={s.situationText}
                    >
                      {situationTitle(it)}
                    </Link>
                    {it.isPublic && <span className={s.muted}>· {tq.guest}</span>}
                  </span>
                </td>
                <td className={s.hideSm}>{kindName(it.kind)}</td>
                <td className={s.hideSm}>
                  {it.categoryCode ? (
                    (catName.get(it.categoryCode) ?? it.categoryCode)
                  ) : (
                    <span className={s.muted}>—</span>
                  )}
                </td>
                <td className={s.hideSm}>
                  <span className={`${s.tag} ${it.isScam ? s.tagScam : ''}`}>
                    {it.isScam ? tq.scam(it.signalCodes.length) : tq.safe}
                  </span>
                </td>
                <td>
                  <span
                    className={`${s.tag} ${it.status === 'published' ? s.tagPublished : s.tagDraft}`}
                  >
                    {it.status === 'published' ? tq.published : tq.draft}
                  </span>{' '}
                  {it.issueCount > 0 && (
                    <span className={`${s.tag} ${s.tagIssue}`}>
                      {tq.issues(it.issueCount)}
                    </span>
                  )}
                </td>
                <td className={`${s.muted} ${s.hideSm}`}>{it.attempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.items.length === 0 && <div className={s.empty}>{tq.empty}</div>}
      </div>

      {pages > 1 && (
        <div className={s.pager}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => setFilter((f) => ({ ...f, page: page - 1 }))}
          >
            ‹ {t.common.prev}
          </button>
          <span>{t.common.page(page, pages)}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={page >= pages}
            onClick={() => setFilter((f) => ({ ...f, page: page + 1 }))}
          >
            {t.common.next} ›
          </button>
        </div>
      )}
    </>
  );
}
