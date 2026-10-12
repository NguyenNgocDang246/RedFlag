'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BookMarked, Plus } from 'lucide-react';
import { IconHeading } from '@/components/icon-heading';
import { SelectInput } from '@/components/select-input';
import {
  BRAND_CHANNELS,
  createBrand,
  deleteBrand,
  errorText,
  listBrands,
  listCategories,
  updateBrand,
  type AdminBrand,
  type AdminCategory,
  type BrandChannel,
  type BrandInput,
} from '@/lib/admin-api';
import s from '../admin.module.css';
import { useAdmin } from '../use-admin';

type BrandLocale = 'en' | 'vi';

/** Example values per BRAND language (content examples, not UI text). */
const CHANNEL_PLACEHOLDER: Record<BrandChannel, Record<BrandLocale, string>> = {
  websites: { vi: 'saomaibank.vn', en: 'northstarbank.com' },
  emailDomains: { vi: 'saomaibank.vn', en: 'northstarbank.com' },
  smsSenders: { vi: 'SAOMAIBANK', en: 'NORTHSTAR' },
  hotlines: { vi: '1800 555 010', en: '1-800-555-0110' },
  apps: {
    vi: 'Sao Mai Mobile — Sao Mai Bank JSC',
    en: 'Northstar Mobile — Northstar Bank plc',
  },
  socialPages: { vi: 'facebook.com/saomaibank', en: 'facebook.com/northstarbank' },
};

/** Each channel is a textarea, one value per line (app names may contain commas). */
type Draft = Omit<BrandInput, BrandChannel> & {
  id?: string;
  locale: BrandLocale;
  channels: Record<BrandChannel, string>;
};

const blank = (locale: BrandLocale): Draft => ({
  code: '',
  locale,
  name: '',
  description: '',
  categoryCode: null,
  order: 0,
  status: 'published',
  channels: Object.fromEntries(BRAND_CHANNELS.map((k) => [k, ''])) as Record<
    BrandChannel,
    string
  >,
});

const toLines = (text: string) =>
  text
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

export default function AdminBrands() {
  const { t, locale } = useAdmin();
  const tb = t.brands;
  const langName = (l: BrandLocale) => t.common.langName[l];
  const [rows, setRows] = useState<AdminBrand[] | null>(null);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [tab, setTab] = useState<BrandLocale>(locale);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      listBrands()
        .then(setRows)
        .catch((e) => setError(errorText(e))),
    [],
  );
  useEffect(() => {
    load();
    listCategories()
      .then(setCategories)
      .catch(() => {});
  }, [load]);

  const edit = (b: AdminBrand) =>
    setDraft({
      id: b.id,
      code: b.code,
      locale: b.locale,
      name: b.name,
      description: b.description,
      categoryCode: b.categoryCode,
      order: b.order,
      status: b.status,
      channels: Object.fromEntries(
        BRAND_CHANNELS.map((k) => [k, b[k].join('\n')]),
      ) as Record<BrandChannel, string>,
    });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError(null);
    const { id, channels, ...rest } = draft;
    const body: BrandInput = {
      ...rest,
      ...(Object.fromEntries(
        BRAND_CHANNELS.map((k) => [k, toLines(channels[k])]),
      ) as Record<BrandChannel, string[]>),
    };
    try {
      if (id) await updateBrand(id, body);
      else await createBrand({ ...body, code: body.code?.trim().toUpperCase() });
      setTab(draft.locale);
      setDraft(null);
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (b: AdminBrand) => {
    if (!confirm(tb.confirmDelete(b.name, b.locale.toUpperCase()))) return;
    setError(null);
    try {
      await deleteBrand(b.id);
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const catName = (code: string | null) =>
    code
      ? categories.find((c) => c.code === code)?.translations[locale].name || code
      : '—';
  const shown = rows?.filter((b) => b.locale === tab) ?? null;
  const count = (l: BrandLocale) => rows?.filter((b) => b.locale === l).length ?? 0;

  return (
    <>
      <IconHeading
        icon={BookMarked}
        title={tb.title}
        sub={tb.sub}
        className={s.pageHead}
        actions={
          !draft && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setDraft(blank(tab))}
            >
              <Plus size={16} aria-hidden /> {tb.newBtn}
            </button>
          )
        }
      />

      {error && <div className={s.alert}>{error}</div>}

      {draft && (
        <form className={s.card} onSubmit={submit}>
          <h2 className={s.cardTitle}>
            {draft.id ? tb.editTitle(draft.name) : tb.newTitle} · {langName(draft.locale)}
          </h2>
          <div className={s.grid3}>
            <label className={s.field}>
              <span className={s.label}>{tb.language}</span>
              <SelectInput
                value={draft.locale}
                disabled={Boolean(draft.id)}
                onChange={(v) => setDraft({ ...draft, locale: v as BrandLocale })}
                options={(['vi', 'en'] as const).map((l) => ({
                  value: l,
                  label: langName(l),
                }))}
              />
              <span className={s.hint}>{tb.languageHint}</span>
            </label>
            <label className={s.field}>
              <span className={s.label}>{t.common.code}</span>
              <input
                className={s.input}
                value={draft.code}
                disabled={Boolean(draft.id)}
                placeholder={
                  draft.locale === 'vi' ? 'VD: SAOMAI_BANK' : 'e.g. NORTHSTAR_BANK'
                }
                onChange={(e) =>
                  setDraft({ ...draft, code: e.target.value.toUpperCase() })
                }
                required
              />
              <span className={s.hint}>{tb.codeHint}</span>
            </label>
            <label className={s.field}>
              <span className={s.label}>{tb.displayName}</span>
              <input
                className={s.input}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                required
              />
            </label>
            <label className={s.field}>
              <span className={s.label}>{tb.category}</span>
              <SelectInput
                value={draft.categoryCode}
                onChange={(v) => setDraft({ ...draft, categoryCode: v || null })}
                placeholder={t.common.none}
                options={categories.map((c) => ({
                  value: c.code,
                  label: c.translations[locale].name || c.code,
                }))}
              />
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
              <span className={s.label}>{tb.status}</span>
              <SelectInput
                value={draft.status}
                onChange={(v) =>
                  setDraft({ ...draft, status: v as BrandInput['status'] })
                }
                options={[
                  { value: 'published', label: tb.statusPublished },
                  { value: 'draft', label: tb.statusDraft },
                ]}
              />
            </label>
          </div>
          <div className={s.grid3}>
            {BRAND_CHANNELS.map((k) => (
              <label key={k} className={s.field}>
                <span className={s.label}>{tb.channels[k]}</span>
                <textarea
                  className={s.textarea}
                  rows={2}
                  value={draft.channels[k]}
                  placeholder={CHANNEL_PLACEHOLDER[k][draft.locale]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      channels: { ...draft.channels, [k]: e.target.value },
                    })
                  }
                />
                <span className={s.hint}>{tb.oneLine}</span>
              </label>
            ))}
          </div>
          <label className={s.field}>
            <span className={s.label}>{tb.description(langName(draft.locale))}</span>
            <textarea
              className={s.textarea}
              value={draft.description}
              placeholder={
                draft.locale === 'vi'
                  ? 'VD: Không bao giờ hỏi mật khẩu hay OTP qua email.'
                  : 'e.g. Never asks for your password or one-time code by email.'
              }
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
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

      <div className={s.tabs} role="tablist">
        {(['vi', 'en'] as const).map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={tab === l}
            className={`${s.tab} ${tab === l ? s.tabActive : ''}`}
            onClick={() => setTab(l)}
          >
            {langName(l)} ({count(l)})
          </button>
        ))}
      </div>

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>{tb.cols.brand}</th>
              <th className={s.hideSm}>{tb.cols.category}</th>
              <th className={s.hideSm}>{tb.cols.webEmail}</th>
              <th className={s.hideSm}>{tb.cols.smsHotline}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown?.map((b) => (
              <tr key={b.id}>
                <td className={s.muted}>{b.order}</td>
                <td>
                  {b.name}
                  {b.status === 'draft' && (
                    <span className={`${s.muted} ${s.small}`}> · {tb.draftTag}</span>
                  )}
                  <div>
                    <span className={s.code}>{b.code}</span>
                  </div>
                </td>
                <td className={`${s.small} ${s.hideSm}`}>{catName(b.categoryCode)}</td>
                <td className={`${s.small} ${s.muted} ${s.hideSm}`}>
                  {[...b.websites, ...b.emailDomains.map((d) => `@${d}`)].join(', ')}
                </td>
                <td className={`${s.small} ${s.muted} ${s.hideSm}`}>
                  {[...b.smsSenders, ...b.hotlines].join(', ')}
                </td>
                <td>
                  <div className={s.actions}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => edit(b)}
                    >
                      {t.common.edit}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-ghost btn-sm ${s.danger}`}
                      onClick={() => remove(b)}
                    >
                      {t.common.delete}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown?.length === 0 && <div className={s.empty}>{tb.empty(langName(tab))}</div>}
      </div>
    </>
  );
}
