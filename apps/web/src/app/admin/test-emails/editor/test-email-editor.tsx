'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, FilePenLine, Lock, Mail, Plus, Send, Settings2, Trash2 } from 'lucide-react';
import { renderSimEmail } from '@redflag/shared';
import { IconHeading } from '@/components/icon-heading';
import { useConfirm } from '@/components/confirm-dialog';
import { SelectInput } from '@/components/select-input';
import {
  AdminError,
  createTestEmail,
  deleteTestEmail,
  errorText,
  getTestEmail,
  listCategories,
  listSignals,
  sendTestEmailToMe,
  setTestEmailStatus,
  updateTestEmail,
  type AdminCategory,
  type AdminSignal,
  type ContentStatus,
  type TestEmailInput,
  type TestEmailText,
} from '@/lib/admin-api';
import type { Locale } from '@/lib/api';
import s from '../../admin.module.css';
import { useAdmin } from '../../use-admin';
import t2 from '../test-emails.module.css';

const LOCALES: Locale[] = ['en', 'vi'];

/** Example content in the language being written (content examples, not UI text). */
const PH: Record<Locale, TestEmailText> = {
  en: {
    senderName: 'e.g. Northstar Bank Security',
    subject: 'e.g. Your card has been blocked',
    body: 'Dear {{name}},\n\nWe blocked your card after an unusual payment. Unblock it within 24 hours or it will be cancelled.\n\n[[Unblock my card]]\n\nNorthstar Bank',
  },
  vi: {
    senderName: 'VD: Bảo mật Ngân hàng Sao Mai',
    subject: 'VD: Thẻ của quý khách đã bị khoá',
    body: 'Kính gửi {{name}},\n\nThẻ của quý khách đã bị khoá do có giao dịch bất thường. Vui lòng mở khoá trong 24 giờ, nếu không thẻ sẽ bị huỷ.\n\n[[Mở khoá thẻ]]\n\nNgân hàng Sao Mai',
  },
};

interface VariantForm {
  /** React key; kept stable for new emails before they have an id. */
  key: string;
  id?: string;
  sent: number;
  difficultyLevel: number;
  signalCodes: string[];
  translations: Record<Locale, TestEmailText>;
}

interface Form {
  code: string;
  categoryCode: string;
  titles: Record<Locale, string>;
  variants: VariantForm[];
}

const emptyText = (): TestEmailText => ({ senderName: '', subject: '', body: '' });
let keySeq = 0;
const newVariant = (): VariantForm => ({
  key: `new-${++keySeq}`,
  sent: 0,
  difficultyLevel: 1,
  signalCodes: [],
  translations: { en: emptyText(), vi: emptyText() },
});
const newForm = (): Form => ({ code: '', categoryCode: '', titles: { en: '', vi: '' }, variants: [newVariant()] });

const isBlank = (t: TestEmailText) => !t.senderName.trim() && !t.subject.trim() && !t.body.trim();

/** Comparable snapshot for "unsaved changes" (ignores the React keys). */
const snapshot = (f: Form) => JSON.stringify({ ...f, variants: f.variants.map(({ key: _k, ...v }) => v) });

function toPayload(f: Form): TestEmailInput {
  return {
    code: f.code.trim().toUpperCase() || undefined,
    categoryCode: f.categoryCode,
    titles: { en: f.titles.en.trim(), vi: f.titles.vi.trim() },
    variants: f.variants.map((v) => ({
      id: v.id,
      difficultyLevel: v.difficultyLevel,
      signalCodes: v.signalCodes,
      translations: { en: v.translations.en, vi: v.translations.vi },
    })),
  };
}

type Named = { code: string; translations: { en: { name: string }; vi: { name: string } } };
const nameIn = (ui: Locale) => (x: Named) =>
  x.translations[ui].name || x.translations[ui === 'vi' ? 'en' : 'vi'].name || x.code;

export function TestEmailEditor({ id }: { id?: string }) {
  const router = useRouter();
  const { t: ta, locale: ui, href } = useAdmin();
  const { ask, dialog } = useConfirm();
  const tt = ta.testEmails;
  const te = ta.editor;
  const nameOf = nameIn(ui);
  const [form, setForm] = useState<Form | null>(id ? null : newForm());
  const [saved, setSaved] = useState(id ? '' : snapshot(newForm()));
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [signals, setSignals] = useState<AdminSignal[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; issues: string[] } | null>(null);
  const [notice, setNotice] = useState<{ text: string; issues: string[] } | null>(null);

  useEffect(() => {
    listSignals()
      .then(setSignals)
      .catch((e) => setError({ message: errorText(e), issues: [] }));
    listCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    getTestEmail(id)
      .then((d) => {
        const f: Form = {
          code: d.code,
          categoryCode: d.categoryCode,
          titles: { en: d.titles.en ?? '', vi: d.titles.vi ?? '' },
          variants: d.variants.map((v) => ({
            key: v.id,
            id: v.id,
            sent: v.sent,
            difficultyLevel: v.difficultyLevel,
            signalCodes: v.signalCodes,
            translations: {
              en: { ...emptyText(), ...v.translations.en },
              vi: { ...emptyText(), ...v.translations.vi },
            },
          })),
        };
        setForm(f);
        setSaved(snapshot(f));
        setStatus(d.status);
        if (d.issues.length) setNotice({ text: te.savedWithIssues(d.issues.length), issues: d.issues });
      })
      .catch((e) => setError({ message: errorText(e), issues: [] }));
  }, [id, te]);

  const dirty = form !== null && snapshot(form) !== saved;

  // Warn when leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  if (!form) {
    return error ? <div className={s.alert}>{error.message}</div> : <p className={s.muted}>{ta.common.loading}</p>;
  }

  const setVariant = (key: string, patch: Partial<VariantForm>) =>
    setForm((f) => (f ? { ...f, variants: f.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) } : f));

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setError({ message: errorText(e), issues: e instanceof AdminError ? e.issues : [] });
    } finally {
      setBusy(false);
    }
  };

  /** Saves; a new template moves to its own URL (which loads the saved ids). */
  const save = async (): Promise<string> => {
    const payload = toPayload(form);
    if (id) {
      const r = await updateTestEmail(id, payload);
      // Reload so new emails get their ids (and "send to me" works on them).
      const d = await getTestEmail(id);
      const f: Form = {
        ...form,
        variants: d.variants.map((v, i) => ({ ...form.variants[i], id: v.id, sent: v.sent })),
      };
      setForm(f);
      setSaved(snapshot(f));
      setNotice({ text: r.issues.length ? te.savedWithIssues(r.issues.length) : te.saved, issues: r.issues });
      return id;
    }
    const r = await createTestEmail(payload);
    setSaved(snapshot(form));
    router.replace(href(`/admin/test-emails/${r.id}`));
    return r.id;
  };

  const onSave = () => run(async () => void (await save()));
  const onPublish = () =>
    run(async () => {
      const tid = dirty || !id ? await save() : id;
      await setTestEmailStatus(tid, 'published');
      setStatus('published');
      setNotice({ text: tt.publishedNotice, issues: [] });
    });
  const onUnpublish = () =>
    run(async () => {
      await setTestEmailStatus(id!, 'draft');
      setStatus('draft');
      setNotice({ text: tt.unpublishedNotice, issues: [] });
    });
  const onDelete = async () => {
    if (
      !(await ask(tt.confirmDelete, {
        confirmLabel: ta.common.delete,
        cancelLabel: ta.common.cancel,
        danger: true,
      }))
    )
      return;
    run(async () => {
      await deleteTestEmail(id!);
      setSaved(snapshot(form)); // avoid the beforeunload warning
      router.push(href('/admin/test-emails'));
    });
  };

  const onSendToMe = async (variantId: string, locale: Locale) => {
    setSending(variantId);
    setSentId(null);
    setError(null);
    try {
      await sendTestEmailToMe(variantId, locale);
      setSentId(variantId);
    } catch (e) {
      setError({ message: errorText(e), issues: [] });
    } finally {
      setSending(null);
    }
  };

  return (
    <>
      <Link href={href('/admin/test-emails')} className={s.back}>
        <ChevronLeft size={16} aria-hidden /> {tt.back}
      </Link>
      <IconHeading
        icon={FilePenLine}
        title={id ? tt.titleEdit : tt.titleNew}
        className={s.pageHead}
        sub={
          <>
            <span className={`${s.tag} ${status === 'published' ? s.tagPublished : s.tagDraft}`}>
              {status === 'published' ? te.published : te.draft}
            </span>{' '}
            {dirty && <span className={s.muted}>· {te.unsaved}</span>}
          </>
        }
        actions={
          <div className={s.actions}>
            {id && (
              <button type="button" className={`btn btn-ghost btn-sm ${s.danger}`} onClick={onDelete} disabled={busy}>
                {ta.common.delete}
              </button>
            )}
            {status === 'published' && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={onUnpublish} disabled={busy}>
                {te.unpublish}
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onSave}
              disabled={busy || (!dirty && Boolean(id))}
            >
              {status === 'published' ? te.saveChanges : te.saveDraft}
            </button>
            {status === 'draft' && (
              <button type="button" className="btn btn-primary btn-sm" onClick={onPublish} disabled={busy}>
                {te.publish}
              </button>
            )}
          </div>
        }
      />

      {error && (
        <div className={s.alert} role="alert">
          {error.message}
          {error.issues.length > 0 && (
            <ul>
              {error.issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {notice && (
        <div className={s.notice}>
          {notice.text}
          {notice.issues.length > 0 && (
            <ul>
              {notice.issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <section className={s.card}>
        <IconHeading icon={Settings2} size="card" as="h2" title={tt.general} className={s.cardHead} />
        <div className={s.grid2}>
          <label className={s.field}>
            <span className={s.label}>{ta.common.code}</span>
            <input
              className={s.input}
              value={form.code}
              disabled={Boolean(id)}
              placeholder="BANK-002"
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />
            <span className={s.hint}>{tt.codeHint}</span>
          </label>
          <label className={s.field}>
            <span className={s.label}>{tt.category}</span>
            <SelectInput
              value={form.categoryCode || null}
              onChange={(v) => setForm({ ...form, categoryCode: v || '' })}
              placeholder={ta.common.none}
              options={categories.map((c) => ({ value: c.code, label: nameOf(c) }))}
            />
          </label>
          {LOCALES.map((l) => (
            <label key={l} className={s.field}>
              <span className={s.label}>{tt.name(ta.common.langName[l])}</span>
              <input
                className={s.input}
                value={form.titles[l]}
                onChange={(e) => setForm({ ...form, titles: { ...form.titles, [l]: e.target.value } })}
              />
            </label>
          ))}
        </div>
        <span className={s.hint}>{tt.nameHint}</span>
      </section>

      {form.variants.map((v, i) => (
        <VariantCard
          key={v.key}
          n={i + 1}
          v={v}
          ui={ui}
          signals={signals}
          nameOf={nameOf}
          canRemove={form.variants.length > 1 && v.sent === 0}
          dirty={dirty}
          sending={sending === v.id}
          sent={sentId !== null && sentId === v.id}
          onChange={(patch) => setVariant(v.key, patch)}
          onRemove={async () => {
            const ok = await ask(tt.confirmRemoveEmail, {
              confirmLabel: tt.removeEmail,
              cancelLabel: ta.common.cancel,
              danger: true,
            });
            if (!ok) return;
            setForm((f) => (f ? { ...f, variants: f.variants.filter((x) => x.key !== v.key) } : f));
          }}
          onSendToMe={(locale) => v.id && void onSendToMe(v.id, locale)}
        />
      ))}

      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => setForm({ ...form, variants: [...form.variants, newVariant()] })}
        disabled={form.variants.length >= 20}
      >
        <Plus size={16} aria-hidden /> {tt.addEmail}
      </button>
      {dialog}
    </>
  );
}

function VariantCard({
  n,
  v,
  ui,
  signals,
  nameOf,
  canRemove,
  dirty,
  sending,
  sent,
  onChange,
  onRemove,
  onSendToMe,
}: {
  n: number;
  v: VariantForm;
  ui: Locale;
  signals: AdminSignal[];
  nameOf: (x: Named) => string;
  canRemove: boolean;
  dirty: boolean;
  sending: boolean;
  sent: boolean;
  onChange: (patch: Partial<VariantForm>) => void;
  onRemove: () => void;
  onSendToMe: (locale: Locale) => void;
}) {
  const { t: ta } = useAdmin();
  const tt = ta.testEmails;
  const te = ta.editor;
  const [tab, setTab] = useState<Locale>(ui);
  const locked = v.sent > 0;
  const text = v.translations[tab];

  const preview = useMemo(
    () =>
      isBlank(text)
        ? null
        : renderSimEmail({ locale: tab, subject: text.subject, body: text.body, name: null, linkUrl: '#preview-link' }),
    [text, tab],
  );

  const setText = (patch: Partial<TestEmailText>) =>
    onChange({ translations: { ...v.translations, [tab]: { ...text, ...patch } } });
  const toggleSignal = (code: string) =>
    onChange({
      signalCodes: v.signalCodes.includes(code)
        ? v.signalCodes.filter((c) => c !== code)
        : [...v.signalCodes, code],
    });

  return (
    <section className={s.card}>
      <IconHeading
        icon={locked ? Lock : Mail}
        size="card"
        as="h2"
        title={tt.emailN(n)}
        className={s.cardHead}
        actions={
          <div className={s.actions}>
            {locked && <span className={`${s.tag} ${s.tagDraft}`}>{tt.lockedTag}</span>}
            {canRemove && (
              <button type="button" className={`btn btn-ghost btn-sm ${s.danger}`} onClick={onRemove}>
                <Trash2 size={15} aria-hidden /> {tt.removeEmail}
              </button>
            )}
          </div>
        }
      />
      {locked && <p className={s.hint}>{tt.locked(v.sent)}</p>}

      <fieldset disabled={locked} className={t2.plainFieldset}>
        <div className={s.grid2}>
          <label className={s.field}>
            <span className={s.label}>{te.difficulty}</span>
            <SelectInput
              value={v.difficultyLevel}
              onChange={(x) => onChange({ difficultyLevel: Number(x) })}
              options={te.levels.map((name, i) => ({ value: i + 1, label: name }))}
            />
          </label>
        </div>
        <div className={s.field}>
          <span className={s.label}>{tt.signs} *</span>
          <div className={s.checks}>
            {signals.map((x) => (
              <label key={x.code} className={`${s.chip} ${v.signalCodes.includes(x.code) ? s.chipOn : ''}`}>
                <input type="checkbox" checked={v.signalCodes.includes(x.code)} onChange={() => toggleSignal(x.code)} />
                {nameOf(x)}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <div className={s.tabs}>
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            className={`${s.tab} ${tab === l ? s.tabActive : ''}`}
            onClick={() => setTab(l)}
          >
            {ta.common.langName[l]}
            {isBlank(v.translations[l]) ? ' ·' : ''}
          </button>
        ))}
      </div>

      <div className={s.editor}>
        <fieldset disabled={locked} className={t2.plainFieldset}>
          <label className={s.field}>
            <span className={s.label}>{tt.sender}</span>
            <input
              className={s.input}
              value={text.senderName}
              placeholder={PH[tab].senderName}
              onChange={(e) => setText({ senderName: e.target.value })}
            />
          </label>
          <label className={s.field}>
            <span className={s.label}>{tt.subject}</span>
            <input
              className={s.input}
              value={text.subject}
              placeholder={PH[tab].subject}
              onChange={(e) => setText({ subject: e.target.value })}
            />
          </label>
          <label className={s.field}>
            <span className={s.label}>{tt.body}</span>
            <textarea
              className={s.textarea}
              rows={10}
              value={text.body}
              placeholder={PH[tab].body}
              onChange={(e) => setText({ body: e.target.value })}
            />
            <span className={s.hint}>{tt.bodyHint}</span>
          </label>
        </fieldset>

        <div className={s.previewCol}>
          <span className={s.label}>{tt.livePreview}</span>
          {preview ? (
            <div className={t2.livePreview}>
              <div className={t2.previewFrom}>{text.senderName}</div>
              <div className={t2.previewSubject}>{preview.subject}</div>
              {/* Sandboxed: rendered as its own document, with nothing granted to it. */}
              <iframe className={t2.previewFrame} sandbox="" srcDoc={preview.html} title={preview.subject} />
            </div>
          ) : (
            <p className={s.hint}>{tt.notWritten}</p>
          )}
          <div className={s.actions}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!v.id || dirty || sending || isBlank(text)}
              onClick={() => onSendToMe(tab)}
            >
              <Send size={15} aria-hidden /> {sending ? tt.sending : tt.sendToMe}
            </button>
          </div>
          {(!v.id || dirty) && <p className={s.hint}>{tt.saveFirst}</p>}
          {sent && <p className={t2.sent}>{tt.sent}</p>}
        </div>
      </div>
    </section>
  );
}
