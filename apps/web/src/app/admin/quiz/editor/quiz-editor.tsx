'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Copy, Eye, FilePenLine, Languages, Settings2 } from 'lucide-react';
import { IconHeading } from '@/components/icon-heading';
import { useConfirm } from '@/components/confirm-dialog';
import { SelectInput } from '@/components/select-input';
import { EDITABLE_QUIZ_KINDS, collectHotspots } from '@redflag/shared';
import {
  AdminError,
  createQuiz,
  deleteQuiz,
  errorText,
  getQuiz,
  listCategories,
  listSignals,
  setQuizStatus,
  updateQuiz,
  type AdminCategory,
  type AdminSignal,
  type ContentStatus,
  type QuizInput,
  type QuizText,
} from '@/lib/admin-api';
import type { Locale } from '@/lib/api';
import { ScenarioShell } from '../../../train/shells';
import s from '../../admin.module.css';
import type { AdminStrings } from '@/lib/admin-i18n';
import { useAdmin } from '../../use-admin';
import { KIND_FIELDS, cleanScenario, emptyScenario } from './scenario-fields';
import { ScenarioForm, SignalCtx } from './span-fields';

const LOCALES: Locale[] = ['en', 'vi'];

/** Example question / explanation in the language of the translation being edited. */
const CONTENT_PH: Record<Locale, { prompt: string; explanation: string }> = {
  en: {
    prompt: 'e.g. Safe or scam? Read this message and tap anything suspicious.',
    explanation:
      'e.g. Northstar Bank never asks you to sign in through a link in a text. The real site is northstarbank.com — open the app or type the address yourself.',
  },
  vi: {
    prompt: 'VD: An toàn hay lừa đảo? Đọc tin nhắn này rồi chạm vào chỗ đáng ngờ.',
    explanation:
      'VD: Sao Mai Bank không bao giờ yêu cầu đăng nhập qua link trong tin nhắn. Trang thật là saomaibank.vn, hãy mở app hoặc tự gõ địa chỉ.',
  },
};

interface Form {
  kind: string;
  isScam: boolean;
  difficultyLevel: number;
  categoryCode: string | null;
  isPublic: boolean;
  order: number;
  signalCodes: string[];
  translations: Record<Locale, QuizText>;
}

const emptyText = (kind: string): QuizText => ({
  title: '',
  prompt: '',
  explanation: '',
  scenario: '',
  scenarioData: emptyScenario(kind),
});

function newForm(): Form {
  const kind = 'sms_inspection';
  return {
    kind,
    isScam: true,
    difficultyLevel: 1,
    categoryCode: null,
    isPublic: false,
    order: 0,
    signalCodes: [],
    translations: { en: emptyText(kind), vi: emptyText(kind) },
  };
}

function toPayload(f: Form): QuizInput {
  const tr = (t: QuizText): QuizText => ({
    title: t.title?.trim() || undefined,
    prompt: t.prompt,
    explanation: t.explanation,
    scenario: t.scenario?.trim() || undefined,
    scenarioData: cleanScenario(f.kind, t.scenarioData),
  });
  return {
    kind: f.kind,
    isScam: f.isScam,
    difficultyLevel: f.difficultyLevel,
    categoryCode: f.categoryCode,
    isPublic: f.isPublic,
    order: f.order,
    signalCodes: f.isScam ? f.signalCodes : [],
    translations: { en: tr(f.translations.en), vi: tr(f.translations.vi) },
  };
}

type Named = {
  code: string;
  translations: { en: { name: string }; vi: { name: string } };
};
const nameIn = (ui: Locale) => (x: Named) =>
  x.translations[ui].name || x.translations[ui === 'vi' ? 'en' : 'vi'].name || x.code;

const langLabel = (t: AdminStrings, l: Locale) => t.common.langName[l];

export function QuizEditor({ id }: { id?: string }) {
  const router = useRouter();
  const { t: ta, locale: ui, href } = useAdmin();
  const { ask, dialog } = useConfirm();
  const te = ta.editor;
  const nameOf = nameIn(ui);
  const [form, setForm] = useState<Form | null>(id ? null : newForm());
  const [saved, setSaved] = useState<string>(id ? '' : JSON.stringify(newForm()));
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [signals, setSignals] = useState<AdminSignal[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [tab, setTab] = useState<Locale>(ui);
  const [mode, setMode] = useState<'hotspots' | 'try'>('hotspots');
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
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
    getQuiz(id)
      .then((q) => {
        const f: Form = {
          kind: q.kind,
          isScam: q.isScam,
          difficultyLevel: q.difficultyLevel,
          categoryCode: q.categoryCode,
          isPublic: q.isPublic,
          order: q.order,
          signalCodes: q.signalCodes,
          translations: {
            en: {
              ...emptyText(q.kind),
              ...q.translations.en,
              scenario: q.translations.en?.scenario ?? '',
            },
            vi: {
              ...emptyText(q.kind),
              ...q.translations.vi,
              scenario: q.translations.vi?.scenario ?? '',
            },
          },
        };
        setForm(f);
        setSaved(JSON.stringify(f));
        setStatus(q.status);
      })
      .catch((e) => setError({ message: errorText(e), issues: [] }));
  }, [id]);

  const dirty = form !== null && JSON.stringify(form) !== saved;

  // Warn when leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const update = useCallback(
    (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f)),
    [],
  );
  const updateText = (locale: Locale, patch: Partial<QuizText>) =>
    setForm((f) =>
      f
        ? {
            ...f,
            translations: {
              ...f.translations,
              [locale]: { ...f.translations[locale], ...patch },
            },
          }
        : f,
    );

  if (!form) {
    return error ? (
      <div className={s.alert}>{error.message}</div>
    ) : (
      <p className={s.muted}>{ta.common.loading}</p>
    );
  }

  const answer = form.isScam ? form.signalCodes : [];
  const t = form.translations[tab];
  const previewData = cleanScenario(form.kind, t.scenarioData);
  const hotspotKeys = [...collectHotspots(previewData).entries()];
  const decoyKeys = hotspotKeys
    .filter(([, sig]) => !answer.includes(sig))
    .map(([k]) => k);

  const changeKind = async (kind: string) => {
    const hasContent = LOCALES.some(
      (l) =>
        JSON.stringify(cleanScenario(form.kind, form.translations[l].scenarioData)) !==
        JSON.stringify(cleanScenario(form.kind, emptyScenario(form.kind))),
    );
    if (
      hasContent &&
      !(await ask(te.confirmChangeKind, { confirmLabel: ta.common.confirm, cancelLabel: ta.common.cancel }))
    )
      return;
    setForm({
      ...form,
      kind,
      translations: {
        en: { ...form.translations.en, scenarioData: emptyScenario(kind) },
        vi: { ...form.translations.vi, scenarioData: emptyScenario(kind) },
      },
    });
    setPicked([]);
  };

  const copyEnToVi = async () => {
    const vi = form.translations.vi;
    const viEmpty =
      JSON.stringify(cleanScenario(form.kind, vi.scenarioData)) ===
      JSON.stringify(cleanScenario(form.kind, emptyScenario(form.kind)));
    if (
      !viEmpty &&
      !(await ask(te.confirmCopy, { confirmLabel: ta.common.confirm, cancelLabel: ta.common.cancel }))
    )
      return;
    updateText('vi', {
      scenarioData: structuredClone(form.translations.en.scenarioData),
    });
    setTab('vi');
  };

  const toggleSignal = (code: string) =>
    update({
      signalCodes: form.signalCodes.includes(code)
        ? form.signalCodes.filter((c) => c !== code)
        : [...form.signalCodes, code],
    });

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setError({
        message: errorText(e),
        issues: e instanceof AdminError ? e.issues : [],
      });
    } finally {
      setBusy(false);
    }
  };

  /** Saves; returns the id (new quizzes navigate to their URL). */
  const save = async (): Promise<string> => {
    const payload = toPayload(form);
    if (id) {
      const r = await updateQuiz(id, payload);
      setSaved(JSON.stringify(form));
      setNotice({
        text: r.issues.length ? te.savedWithIssues(r.issues.length) : te.saved,
        issues: r.issues,
      });
      return id;
    }
    const r = await createQuiz(payload);
    setSaved(JSON.stringify(form));
    router.replace(href(`/admin/quiz/${r.id}`));
    return r.id;
  };

  const onSave = () => run(async () => void (await save()));
  const onPublish = () =>
    run(async () => {
      const qid = dirty || !id ? await save() : id;
      await setQuizStatus(qid, 'published');
      setStatus('published');
      setNotice({ text: te.publishedNotice, issues: [] });
    });
  const onUnpublish = () =>
    run(async () => {
      await setQuizStatus(id!, 'draft');
      setStatus('draft');
      setNotice({ text: te.unpublishedNotice, issues: [] });
    });
  const onDelete = async () => {
    if (
      !(await ask(te.confirmDelete, {
        confirmLabel: ta.common.delete,
        cancelLabel: ta.common.cancel,
        danger: true,
      }))
    )
      return;
    run(async () => {
      await deleteQuiz(id!);
      setSaved(JSON.stringify(form)); // avoid the beforeunload warning
      router.push(href('/admin/quiz'));
    });
  };

  return (
    <SignalCtx.Provider
      value={{ signals: signals.map((x) => ({ code: x.code, name: nameOf(x) })), answer }}
    >
      <Link href={href('/admin/quiz')} className={s.back}>
        <ChevronLeft size={16} aria-hidden /> {te.back}
      </Link>
      <IconHeading
        icon={FilePenLine}
        title={id ? te.titleEdit : te.titleNew}
        className={s.pageHead}
        sub={
          <>
            <span
              className={`${s.tag} ${status === 'published' ? s.tagPublished : s.tagDraft}`}
            >
              {status === 'published' ? te.published : te.draft}
            </span>{' '}
            {dirty && <span className={s.muted}>· {te.unsaved}</span>}
          </>
        }
        actions={
          <div className={s.actions}>
            {id && (
              <button
                type="button"
                className={`btn btn-ghost btn-sm ${s.danger}`}
                onClick={onDelete}
                disabled={busy}
              >
                {ta.common.delete}
              </button>
            )}
            {status === 'published' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onUnpublish}
                disabled={busy}
              >
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
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onPublish}
                disabled={busy}
              >
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

      <div className={s.editor}>
        <div>
          <section className={s.card}>
            <IconHeading
              icon={Settings2}
              size="card"
              as="h2"
              title={te.general}
              className={s.cardHead}
            />
            <div className={s.grid2}>
              <label className={s.field}>
                <span className={s.label}>{te.shellKind}</span>
                <SelectInput
                  value={form.kind}
                  onChange={changeKind}
                  options={EDITABLE_QUIZ_KINDS.map((k) => ({
                    value: k,
                    label: ta.kinds[k] ?? k,
                  }))}
                />
              </label>
              <label className={s.field}>
                <span className={s.label}>{te.category}</span>
                <SelectInput
                  value={form.categoryCode}
                  onChange={(v) => update({ categoryCode: v || null })}
                  placeholder={ta.common.none}
                  options={categories.map((c) => ({ value: c.code, label: nameOf(c) }))}
                />
              </label>
              <label className={s.field}>
                <span className={s.label}>{te.answer}</span>
                <SelectInput
                  value={form.isScam ? 'scam' : 'safe'}
                  onChange={(v) => update({ isScam: v === 'scam' })}
                  options={[
                    { value: 'scam', label: te.scam },
                    { value: 'safe', label: te.safe },
                  ]}
                />
              </label>
              <label className={s.field}>
                <span className={s.label}>{te.difficulty}</span>
                <SelectInput
                  value={form.difficultyLevel}
                  onChange={(v) => update({ difficultyLevel: Number(v) })}
                  options={te.levels.map((name, i) => ({ value: i + 1, label: name }))}
                />
              </label>
              <label className={s.field}>
                <span className={s.label}>{ta.common.order}</span>
                <input
                  className={s.input}
                  type="number"
                  min={0}
                  value={form.order}
                  onChange={(e) =>
                    update({ order: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </label>
              <div className={s.field}>
                <span className={s.label}>{te.visibility}</span>
                <label className={s.check}>
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) => update({ isPublic: e.target.checked })}
                  />
                  {te.guestCan}
                </label>
              </div>
            </div>

            <div className={s.field}>
              <span className={s.label}>
                {te.answerSignals} {form.isScam ? '*' : ''}
              </span>
              {form.isScam ? (
                <div className={s.checks}>
                  {signals.map((x) => (
                    <label
                      key={x.code}
                      className={`${s.chip} ${form.signalCodes.includes(x.code) ? s.chipOn : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={form.signalCodes.includes(x.code)}
                        onChange={() => toggleSignal(x.code)}
                      />
                      {nameOf(x)}
                    </label>
                  ))}
                </div>
              ) : (
                <span className={s.hint}>{te.safeHint}</span>
              )}
            </div>
          </section>

          <section className={s.card}>
            <IconHeading
              icon={Languages}
              size="card"
              as="h2"
              title={te.content}
              className={s.cardHead}
            />
            <div className={s.tabs}>
              {LOCALES.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`${s.tab} ${tab === l ? s.tabActive : ''}`}
                  onClick={() => setTab(l)}
                >
                  {langLabel(ta, l)}
                </button>
              ))}
              <span className={s.spacer} />
              <button
                type="button"
                className={s.addBtn}
                onClick={copyEnToVi}
                title={te.copyTitle}
              >
                <Copy size={14} aria-hidden /> {te.copyEnVi}
              </button>
            </div>

            <label className={s.field}>
              <span className={s.label}>{te.libTitle}</span>
              <input
                className={s.input}
                value={t.title ?? ''}
                maxLength={120}
                placeholder={
                  tab === 'vi'
                    ? 'VD: Trang đăng nhập Sao Mai Bank'
                    : 'e.g. Northstar Bank login page'
                }
                onChange={(e) => updateText(tab, { title: e.target.value })}
              />
              <span className={s.hint}>{te.libTitleHint}</span>
            </label>

            <label className={s.field}>
              <span className={s.label}>{te.prompt}</span>
              <input
                className={s.input}
                value={t.prompt}
                placeholder={CONTENT_PH[tab].prompt}
                onChange={(e) => updateText(tab, { prompt: e.target.value })}
              />
            </label>

            <ScenarioForm
              fields={KIND_FIELDS[form.kind] ?? []}
              contentLocale={tab}
              data={t.scenarioData}
              onChange={(scenarioData) => updateText(tab, { scenarioData })}
            />

            <label className={s.field}>
              <span className={s.label}>{te.explanation}</span>
              <textarea
                className={s.textarea}
                value={t.explanation}
                placeholder={CONTENT_PH[tab].explanation}
                onChange={(e) => updateText(tab, { explanation: e.target.value })}
              />
            </label>
            <label className={s.field}>
              <span className={s.label}>{te.seoText}</span>
              <textarea
                className={s.textarea}
                value={t.scenario ?? ''}
                placeholder={te.seoPh}
                onChange={(e) => updateText(tab, { scenario: e.target.value })}
              />
            </label>
          </section>
        </div>

        <div className={s.previewCol}>
          <div className={s.toolbar}>
            <IconHeading
              icon={Eye}
              size="card"
              as="h2"
              title={te.preview(tab.toUpperCase())}
            />
            <span className={s.spacer} />
            <div className={s.checks}>
              <label className={`${s.chip} ${mode === 'hotspots' ? s.chipOn : ''}`}>
                <input
                  type="radio"
                  checked={mode === 'hotspots'}
                  onChange={() => setMode('hotspots')}
                />
                {te.showHotspots}
              </label>
              <label className={`${s.chip} ${mode === 'try' ? s.chipOn : ''}`}>
                <input
                  type="radio"
                  checked={mode === 'try'}
                  onChange={() => {
                    setMode('try');
                    setPicked([]);
                  }}
                />
                {te.tryIt}
              </label>
            </div>
          </div>
          <div className={s.previewBox}>
            {mode === 'hotspots' ? (
              <ScenarioShell
                kind={form.kind}
                data={previewData}
                selected={decoyKeys}
                onToggle={() => {}}
                locked
                locale={tab}
                reveal={{ matched: answer, missed: [], wrong: [] }}
              />
            ) : (
              <ScenarioShell
                kind={form.kind}
                data={previewData}
                selected={picked}
                onToggle={(k) =>
                  setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))
                }
                locked={false}
                locale={tab}
              />
            )}
          </div>
          {mode === 'hotspots' && (
            <div className={s.legend}>
              <span>
                <span className={s.legendDot} style={{ background: 'var(--success)' }} />
                {te.legendCorrect}
              </span>
              <span>
                <span className={s.legendDot} style={{ background: 'var(--danger)' }} />
                {te.legendDecoy}
              </span>
            </div>
          )}
        </div>
      </div>
      {dialog}
    </SignalCtx.Provider>
  );
}
