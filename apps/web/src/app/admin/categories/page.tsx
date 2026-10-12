'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { FolderTree, Plus } from 'lucide-react';
import { IconHeading } from '@/components/icon-heading';
import {
  createCategory,
  deleteCategory,
  errorText,
  listCategories,
  updateCategory,
  type AdminCategory,
  type CategoryInput,
} from '@/lib/admin-api';
import s from '../admin.module.css';
import { useAdmin } from '../use-admin';

type Draft = CategoryInput & { id?: string; impersonatesText: string };

const blank = (): Draft => ({
  code: '',
  impersonates: [],
  impersonatesText: '',
  order: 0,
  translations: { en: { name: '', description: '' }, vi: { name: '', description: '' } },
});

export default function AdminCategories() {
  const { t, locale } = useAdmin();
  const tc = t.categories;
  const [rows, setRows] = useState<AdminCategory[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      listCategories()
        .then(setRows)
        .catch((e) => setError(errorText(e))),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  const edit = (c: AdminCategory) =>
    setDraft({
      id: c.id,
      code: c.code,
      impersonates: c.impersonates,
      impersonatesText: c.impersonates.join(', '),
      order: c.order,
      translations: {
        en: {
          name: c.translations.en.name,
          description: c.translations.en.description ?? '',
        },
        vi: {
          name: c.translations.vi.name,
          description: c.translations.vi.description ?? '',
        },
      },
    });

  const setText = (locale: 'en' | 'vi', key: 'name' | 'description', v: string) =>
    setDraft(
      (d) =>
        d && {
          ...d,
          translations: {
            ...d.translations,
            [locale]: { ...d.translations[locale], [key]: v },
          },
        },
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError(null);
    const { id, impersonatesText, ...body } = draft;
    body.impersonates = impersonatesText
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    try {
      if (id) await updateCategory(id, body);
      else await createCategory({ ...body, code: body.code?.trim().toUpperCase() });
      setDraft(null);
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: AdminCategory) => {
    if (!confirm(tc.confirmDelete(c.code))) return;
    setError(null);
    try {
      await deleteCategory(c.id);
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <>
      <IconHeading
        icon={FolderTree}
        title={tc.title}
        sub={tc.sub}
        className={s.pageHead}
        actions={
          !draft && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setDraft(blank())}
            >
              <Plus size={16} aria-hidden /> {tc.newBtn}
            </button>
          )
        }
      />

      {error && <div className={s.alert}>{error}</div>}

      {draft && (
        <form className={s.card} onSubmit={submit}>
          <h2 className={s.cardTitle}>
            {draft.id ? tc.editTitle(draft.code ?? '') : tc.newTitle}
          </h2>
          <div className={s.grid3}>
            <label className={s.field}>
              <span className={s.label}>{t.common.code}</span>
              <input
                className={s.input}
                value={draft.code}
                disabled={Boolean(draft.id)}
                placeholder={tc.codePh}
                onChange={(e) =>
                  setDraft({ ...draft, code: e.target.value.toUpperCase() })
                }
                required
              />
              <span className={s.hint}>{t.common.upperCodeHint}</span>
            </label>
            <label className={s.field}>
              <span className={s.label}>{t.common.order}</span>
              <input
                className={s.input}
                type="number"
                min={0}
                value={draft.order}
                onChange={(e) =>
                  setDraft({ ...draft, order: Number(e.target.value) || 0 })
                }
              />
            </label>
            <label className={s.field}>
              <span className={s.label}>{tc.impersonates}</span>
              <input
                className={s.input}
                value={draft.impersonatesText}
                placeholder={tc.impersonatesPh}
                onChange={(e) => setDraft({ ...draft, impersonatesText: e.target.value })}
              />
            </label>
          </div>
          <div className={s.grid2}>
            {(['en', 'vi'] as const).map((l) => (
              <div key={l}>
                <label className={s.field}>
                  <span className={s.label}>{t.common.nameIn(l.toUpperCase())}</span>
                  <input
                    className={s.input}
                    value={draft.translations[l].name}
                    onChange={(e) => setText(l, 'name', e.target.value)}
                    required
                  />
                </label>
                <label className={s.field}>
                  <span className={s.label}>{t.common.descIn(l.toUpperCase())}</span>
                  <textarea
                    className={s.textarea}
                    value={draft.translations[l].description ?? ''}
                    onChange={(e) => setText(l, 'description', e.target.value)}
                  />
                </label>
              </div>
            ))}
          </div>
          <div className={s.actions}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {t.common.save}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setDraft(null)}
            >
              {t.common.cancel}
            </button>
          </div>
        </form>
      )}

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>{t.common.codeCol}</th>
              <th>{tc.cols.name}</th>
              <th className={s.hideSm}>{tc.cols.impersonates}</th>
              <th className={s.hideSm}>{t.common.inUse}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows?.map((c) => (
              <tr key={c.id}>
                <td className={s.muted}>{c.order}</td>
                <td>
                  <span className={s.code}>{c.code}</span>
                </td>
                <td>
                  {c.translations[locale].name || <span className={s.muted}>—</span>}
                  <div className={`${s.muted} ${s.small}`}>
                    {c.translations[locale === 'vi' ? 'en' : 'vi'].name}
                  </div>
                </td>
                <td className={`${s.small} ${s.muted} ${s.hideSm}`}>
                  {c.impersonates.join(', ')}
                </td>
                <td className={`${s.small} ${s.hideSm}`}>
                  {tc.usage(c.usage.quiz, c.usage.templates)}
                </td>
                <td>
                  <div className={s.actions}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => edit(c)}
                    >
                      {t.common.edit}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-ghost btn-sm ${s.danger}`}
                      onClick={() => remove(c)}
                    >
                      {t.common.delete}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows?.length === 0 && <div className={s.empty}>{tc.empty}</div>}
      </div>
    </>
  );
}
