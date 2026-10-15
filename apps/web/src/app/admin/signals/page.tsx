'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Flag, Plus } from 'lucide-react';
import { IconHeading } from '@/components/icon-heading';
import { useConfirm } from '@/components/confirm-dialog';
import {
  createSignal,
  deleteSignal,
  errorText,
  listSignals,
  updateSignal,
  type AdminSignal,
  type SignalInput,
} from '@/lib/admin-api';
import s from '../admin.module.css';
import { useAdmin } from '../use-admin';

type Draft = SignalInput & { id?: string };

const blank = (): Draft => ({
  code: '',
  translations: { en: { name: '', explanation: '' }, vi: { name: '', explanation: '' } },
});

export default function AdminSignals() {
  const { t, locale } = useAdmin();
  const { ask, dialog } = useConfirm();
  const ts = t.signals;
  const [rows, setRows] = useState<AdminSignal[] | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      listSignals()
        .then(setRows)
        .catch((e) => setError(errorText(e))),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  const setText = (locale: 'en' | 'vi', key: 'name' | 'explanation', v: string) =>
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
    const { id, ...body } = draft;
    try {
      if (id) await updateSignal(id, body);
      else await createSignal({ ...body, code: body.code?.trim().toUpperCase() });
      setDraft(null);
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (x: AdminSignal) => {
    if (!(await ask(ts.confirmDelete(x.code), { confirmLabel: t.common.delete, cancelLabel: t.common.cancel, danger: true }))) return;
    setError(null);
    try {
      await deleteSignal(x.id);
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <>
      <IconHeading
        icon={Flag}
        title={ts.title}
        sub={ts.sub}
        className={s.pageHead}
        actions={
          !draft && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setDraft(blank())}
            >
              <Plus size={16} aria-hidden /> {ts.newBtn}
            </button>
          )
        }
      />

      {error && <div className={s.alert}>{error}</div>}

      {draft && (
        <form className={s.card} onSubmit={submit}>
          <h2 className={s.cardTitle}>
            {draft.id ? ts.editTitle(draft.code ?? '') : ts.newTitle}
          </h2>
          <label className={s.field}>
            <span className={s.label}>{t.common.code}</span>
            <input
              className={`${s.input} ${s.inputSm}`}
              value={draft.code}
              disabled={Boolean(draft.id)}
              placeholder={ts.codePh}
              onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
              required
            />
          </label>
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
                  <span className={s.label}>{ts.explanationIn(l.toUpperCase())}</span>
                  <textarea
                    className={s.textarea}
                    value={draft.translations[l].explanation}
                    onChange={(e) => setText(l, 'explanation', e.target.value)}
                    required
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
              <th>{t.common.codeCol}</th>
              <th>{ts.cols.name}</th>
              <th className={s.hideSm}>
                {ts.cols.explanation} ({locale.toUpperCase()})
              </th>
              <th className={s.hideSm}>{t.common.inUse}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows?.map((x) => (
              <tr key={x.id}>
                <td>
                  <span className={s.code}>{x.code}</span>
                </td>
                <td>
                  {x.translations[locale].name || <span className={s.muted}>—</span>}
                  <div className={`${s.muted} ${s.small}`}>
                    {x.translations[locale === 'vi' ? 'en' : 'vi'].name}
                  </div>
                </td>
                <td className={`${s.small} ${s.muted} ${s.hideSm}`}>
                  {x.translations[locale].explanation}
                </td>
                <td className={`${s.small} ${s.hideSm}`}>
                  {ts.usage(x.usage.quiz, x.usage.hotspots)}
                </td>
                <td>
                  <div className={s.actions}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() =>
                        setDraft({ id: x.id, code: x.code, translations: x.translations })
                      }
                    >
                      {t.common.edit}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-ghost btn-sm ${s.danger}`}
                      onClick={() => remove(x)}
                    >
                      {t.common.delete}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows?.length === 0 && <div className={s.empty}>{ts.empty}</div>}
      </div>
      {dialog}
    </>
  );
}
