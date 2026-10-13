'use client';

import { createContext, useContext } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import type { Span } from '@redflag/shared';
import { SelectInput } from '@/components/select-input';
import s from '../../admin.module.css';
import { useAdmin } from '../../use-admin';
import type { FieldDef } from './scenario-fields';

/** Signals (from DB) + current answer set — to mark hotspots as correct / decoy. */
export const SignalCtx = createContext<{
  signals: { code: string; name: string }[];
  answer: string[];
}>({
  signals: [],
  answer: [],
});

type Hot = { text: string; signal: string; href?: string; note?: string };

const textOf = (v: unknown) =>
  typeof v === 'string' ? v : ((v as Hot | undefined)?.text ?? '');
const signalOf = (v: unknown) =>
  v && typeof v === 'object' ? ((v as Hot).signal ?? '') : '';
const noteOf = (v: unknown) =>
  v && typeof v === 'object' ? ((v as Hot).note ?? '') : '';
/** Builds a span from text + signal, keeping `href` (no UI for it yet) and the decoy `note` from the previous value. */
const makeSpan = (
  text: string,
  signal: string,
  prev?: unknown,
  note = noteOf(prev),
): Span => {
  const href = prev && typeof prev === 'object' ? (prev as Hot).href : undefined;
  return signal
    ? { text, signal, ...(href ? { href } : {}), ...(note ? { note } : {}) }
    : text;
};

/** Every hotspot needs a per-quiz reason (decoy: why it is normal; correct: why it is a red flag) — shown after grading. */
function NoteInput({
  signal,
  value,
  onChange,
}: {
  signal: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { answer } = useContext(SignalCtx);
  const t = useAdmin().t.span;
  if (!signal) return null;
  const correct = answer.includes(signal);
  return (
    <input
      className={`${s.input} ${s.noteInput}`}
      placeholder={correct ? t.noteCorrectPh : t.noteDecoyPh}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** Picks a signal for a content piece: none = plain text; answer signal = correct hotspot; other = decoy. */
function SignalSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { signals, answer } = useContext(SignalCtx);
  const t = useAdmin().t.span;
  const tone = !value ? undefined : answer.includes(value) ? 'success' : 'warn';
  const known = !value || signals.some((x) => x.code === value);
  return (
    <SelectInput
      tone={tone}
      value={value}
      onChange={onChange}
      title={!value ? t.plain : answer.includes(value) ? t.hotCorrect : t.hotDecoy}
      placeholder={t.plainOption}
      options={[
        ...(known ? [] : [{ value, label: t.unknown(value) }]),
        ...signals.map((x) => ({
          value: x.code,
          label: `${answer.includes(x.code) ? '✓' : '◦'} ${x.name}`,
        })),
      ]}
    />
  );
}

function RowButtons({
  i,
  n,
  onMove,
  onRemove,
}: {
  i: number;
  n: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}) {
  const t = useAdmin().t.span;
  return (
    <div className={s.rowBtns}>
      <button
        type="button"
        className={s.iconBtn}
        disabled={i === 0}
        onClick={() => onMove(i, i - 1)}
        aria-label={t.up}
        title={t.up}
      >
        <ArrowUp size={15} />
      </button>
      <button
        type="button"
        className={s.iconBtn}
        disabled={i === n - 1}
        onClick={() => onMove(i, i + 1)}
        aria-label={t.down}
        title={t.down}
      >
        <ArrowDown size={15} />
      </button>
      <button
        type="button"
        className={s.iconBtn}
        onClick={onRemove}
        aria-label={t.removeRow}
        title={t.removeRow}
      >
        <X size={15} />
      </button>
    </div>
  );
}

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

export function SpanInput({
  value,
  onChange,
  placeholder,
}: {
  value: unknown;
  onChange: (v: Span) => void;
  placeholder?: string;
}) {
  const text = textOf(value);
  const signal = signalOf(value);
  return (
    <div className={`${s.spanRow} ${s.spanRowSingle}`}>
      <input
        className={s.input}
        value={text}
        placeholder={placeholder}
        onChange={(e) => onChange(makeSpan(e.target.value, signal, value))}
      />
      <SignalSelect
        value={signal}
        onChange={(sig) => onChange(makeSpan(text, sig, value))}
      />
      <NoteInput
        signal={signal}
        value={noteOf(value)}
        onChange={(n) => onChange(makeSpan(text, signal, value, n))}
      />
    </div>
  );
}

function SpanList({
  value,
  onChange,
  placeholder,
}: {
  value: unknown;
  onChange: (v: Span[]) => void;
  placeholder?: string;
}) {
  const t = useAdmin().t.span;
  const list = Array.isArray(value) ? (value as Span[]) : [];
  const set = (i: number, v: Span) => onChange(list.map((x, j) => (j === i ? v : x)));
  return (
    <div className={s.group}>
      {list.map((item, i) => (
        <div key={i} className={s.spanRow}>
          <input
            className={s.input}
            value={textOf(item)}
            placeholder={placeholder}
            onChange={(e) => set(i, makeSpan(e.target.value, signalOf(item), item))}
          />
          <SignalSelect
            value={signalOf(item)}
            onChange={(sig) => set(i, makeSpan(textOf(item), sig, item))}
          />
          <RowButtons
            i={i}
            n={list.length}
            onMove={(a, b) => onChange(move(list, a, b))}
            onRemove={() => onChange(list.filter((_, j) => j !== i))}
          />
          <NoteInput
            signal={signalOf(item)}
            value={noteOf(item)}
            onChange={(n) => set(i, makeSpan(textOf(item), signalOf(item), item, n))}
          />
        </div>
      ))}
      <button type="button" className={s.addBtn} onClick={() => onChange([...list, ''])}>
        <Plus size={14} aria-hidden /> {t.addLine}
      </button>
    </div>
  );
}

type Bubble = { from: 'them' | 'me'; text: Span };

function Bubbles({
  value,
  onChange,
  placeholder,
}: {
  value: unknown;
  onChange: (v: Bubble[]) => void;
  placeholder?: string;
}) {
  const t = useAdmin().t.span;
  const list = Array.isArray(value) ? (value as Bubble[]) : [];
  const set = (i: number, b: Bubble) => onChange(list.map((x, j) => (j === i ? b : x)));
  return (
    <div className={s.group}>
      {list.map((b, i) => (
        <div key={i} className={`${s.spanRow} ${s.spanRowBubble}`}>
          <SelectInput
            value={b.from}
            onChange={(v) => set(i, { ...b, from: v as Bubble['from'] })}
            options={[
              { value: 'them', label: t.them },
              { value: 'me', label: t.me },
            ]}
          />
          <input
            className={s.input}
            value={textOf(b.text)}
            placeholder={placeholder}
            onChange={(e) =>
              set(i, { ...b, text: makeSpan(e.target.value, signalOf(b.text), b.text) })
            }
          />
          <SignalSelect
            value={signalOf(b.text)}
            onChange={(sig) =>
              set(i, { ...b, text: makeSpan(textOf(b.text), sig, b.text) })
            }
          />
          <RowButtons
            i={i}
            n={list.length}
            onMove={(a, c) => onChange(move(list, a, c))}
            onRemove={() => onChange(list.filter((_, j) => j !== i))}
          />
          <NoteInput
            signal={signalOf(b.text)}
            value={noteOf(b.text)}
            onChange={(n) =>
              set(i, {
                ...b,
                text: makeSpan(textOf(b.text), signalOf(b.text), b.text, n),
              })
            }
          />
        </div>
      ))}
      <button
        type="button"
        className={s.addBtn}
        onClick={() => onChange([...list, { from: 'them', text: '' }])}
      >
        <Plus size={14} aria-hidden /> {t.addMessage}
      </button>
    </div>
  );
}

type Attachment = { name: string; size?: string; signal?: string; note?: string };

function Attachments({
  value,
  onChange,
  placeholder,
}: {
  value: unknown;
  onChange: (v: Attachment[]) => void;
  placeholder?: string;
}) {
  const t = useAdmin().t.span;
  const list = Array.isArray(value) ? (value as Attachment[]) : [];
  const set = (i: number, a: Attachment) =>
    onChange(list.map((x, j) => (j === i ? a : x)));
  return (
    <div className={s.group}>
      {list.map((a, i) => (
        <div key={i} className={`${s.spanRow} ${s.spanRowAtt}`}>
          <input
            className={s.input}
            placeholder={placeholder ?? t.fileName}
            value={a.name}
            onChange={(e) => set(i, { ...a, name: e.target.value })}
          />
          <input
            className={s.input}
            placeholder="248 KB"
            value={a.size ?? ''}
            onChange={(e) => set(i, { ...a, size: e.target.value })}
          />
          <SignalSelect
            value={a.signal ?? ''}
            onChange={(sig) => set(i, { ...a, signal: sig || undefined })}
          />
          <RowButtons
            i={i}
            n={list.length}
            onMove={(x, y) => onChange(move(list, x, y))}
            onRemove={() => onChange(list.filter((_, j) => j !== i))}
          />
          <NoteInput
            signal={a.signal ?? ''}
            value={a.note ?? ''}
            onChange={(n) => set(i, { ...a, note: n || undefined })}
          />
        </div>
      ))}
      <button
        type="button"
        className={s.addBtn}
        onClick={() => onChange([...list, { name: '' }])}
      >
        <Plus size={14} aria-hidden /> {t.addFile}
      </button>
    </div>
  );
}

/** scenarioData form driven by the shell kind's field config. */
export function ScenarioForm({
  fields,
  data,
  onChange,
  contentLocale,
}: {
  fields: FieldDef[];
  data: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /** Language of the translation being edited — picks the example placeholders. */
  contentLocale: 'en' | 'vi';
}) {
  const { locale } = useAdmin();
  const set = (key: string, v: unknown) => onChange({ ...data, [key]: v });
  // "e.g." / "VD:" so an example never looks like a value that's already filled in.
  const example = (f: FieldDef) =>
    `${contentLocale === 'vi' ? 'VD:' : 'e.g.'} ${f.placeholder[contentLocale]}`;
  return (
    <>
      {fields.map((f) => (
        <div key={f.key} className={s.field}>
          <span className={s.label}>
            {f.label[locale]}
            {(f.type === 'span' || f.type === 'spanList' || f.type === 'bubbles') && ' *'}
          </span>
          {f.type === 'text' && (
            <input
              className={s.input}
              value={(data[f.key] as string) ?? ''}
              placeholder={example(f)}
              onChange={(e) => set(f.key, e.target.value)}
            />
          )}
          {(f.type === 'span' || f.type === 'spanOpt') && (
            <SpanInput
              value={data[f.key] ?? ''}
              placeholder={example(f)}
              onChange={(v) => set(f.key, v)}
            />
          )}
          {(f.type === 'spanList' || f.type === 'spanListOpt') && (
            <SpanList
              value={data[f.key]}
              placeholder={example(f)}
              onChange={(v) => set(f.key, v)}
            />
          )}
          {f.type === 'bubbles' && (
            <Bubbles
              value={data[f.key]}
              placeholder={example(f)}
              onChange={(v) => set(f.key, v)}
            />
          )}
          {f.type === 'attachments' && (
            <Attachments
              value={data[f.key]}
              placeholder={example(f)}
              onChange={(v) => set(f.key, v)}
            />
          )}
          {f.hint && <span className={s.hint}>{f.hint[locale]}</span>}
        </div>
      ))}
    </>
  );
}
