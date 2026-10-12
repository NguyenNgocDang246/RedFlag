/**
 * Quiz content rules — shared by seed, the data CLI and the admin API. The full authoring-quality rules
 * gate agent-generated content (CLI); admin UI edits only get the `basic` checks (see RuleMode).
 * Functions return a list of errors (empty = valid) and never throw.
 */
import type { Locale } from './locale';
import { QuizKind } from './scenarios';

const q = (xs: string[]) => xs.map((x) => `"${x}"`).join(', ');

/** Rule messages per locale (API responses follow the admin UI language; seed/CLI default to VI). */
export const RULE_MSG = {
  vi: {
    scamNeedsSignal: 'bài lừa đảo cần ít nhất 1 signal đáp án',
    signalNoHotspot: (c: string[]) => `signal đáp án không có hotspot: ${c.join(', ')}`,
    decoyNoNote: (t: string[]) =>
      `hotspot mồi thiếu giải thích vì sao bình thường: ${q(t)}`,
    correctNoNote: (t: string[]) =>
      `hotspot đúng thiếu giải thích vì sao đáng ngờ: ${q(t)}`,
    needDecoy: 'cần ít nhất 1 hotspot mồi (chỗ trông đáng ngờ nhưng bình thường)',
    noteTooShort: (min: number, t: string[]) =>
      `giải thích hotspot quá ngắn (<${min} ký tự): ${q(t)}`,
    noteDuplicate: (t: string[]) =>
      `giải thích hotspot bị trùng nguyên văn trong cùng bài: ${q(t)}`,
    hintNoDecoy: 'chưa có hotspot mồi — bắt buộc ít nhất 1',
    hintUnbalanced: (decoys: number, correct: number) =>
      `số mồi (${decoys}) lệch nhiều so với số hotspot đúng (${correct}) — chỉ là gợi ý`,
    hintSingle:
      'mỗi signal đáp án chỉ có 1 hotspot — cân nhắc thêm chỗ thứ hai nếu hợp lý',
    missing: (k: string) => `thiếu "${k}"`,
    invalid: (k: string) => `"${k}" không hợp lệ`,
    minLines: (k: string, min: number) => `"${k}" cần ít nhất ${min} dòng`,
    emptyLine: (k: string, i: number) => `"${k}" dòng ${i} trống`,
    noScenario: 'thiếu nội dung mô phỏng',
    attachmentNoName: (i: number) => `tệp đính kèm ${i} thiếu tên`,
    needBubble: '"bubbles" cần ít nhất 1 tin',
    bubbleFrom: (i: number) => `tin ${i}: "from" phải là them/me`,
    bubbleEmpty: (i: number) => `tin ${i} trống`,
    noShell: (k: string) => `loại "${k}" chưa có vỏ mô phỏng`,
    missingPrompt: 'thiếu câu hỏi (prompt)',
    missingExplanation: 'thiếu giải thích',
    missingTranslation: 'thiếu bản dịch',
    unknownSignal: (c: string[]) => `signal không tồn tại: ${c.join(', ')}`,
    unknownCategory: (c: string) => `category không tồn tại: ${c}`,
    strayHotspot: (c: string[]) => `hotspot gắn signal không tồn tại: ${c.join(', ')}`,
    noteUsedElsewhere: (t: string) =>
      `giải thích hotspot trùng nguyên văn với bài khác: "${t}…" — viết riêng cho bài này`,
  },
  en: {
    scamNeedsSignal: 'a scam quiz needs at least 1 answer signal',
    signalNoHotspot: (c: string[]) => `answer signal has no hotspot: ${c.join(', ')}`,
    decoyNoNote: (t: string[]) => `decoy hotspot is missing why it is normal: ${q(t)}`,
    correctNoNote: (t: string[]) =>
      `correct hotspot is missing why it is suspicious: ${q(t)}`,
    needDecoy: 'needs at least 1 decoy hotspot (looks suspicious but is normal)',
    noteTooShort: (min: number, t: string[]) =>
      `hotspot explanation too short (<${min} characters): ${q(t)}`,
    noteDuplicate: (t: string[]) =>
      `hotspot explanation repeated word-for-word in this quiz: ${q(t)}`,
    hintNoDecoy: 'no decoy hotspot yet — at least 1 is required',
    hintUnbalanced: (decoys: number, correct: number) =>
      `decoys (${decoys}) are far from correct hotspots (${correct}) — just a suggestion`,
    hintSingle:
      'each answer signal has only 1 hotspot — consider a second one where it makes sense',
    missing: (k: string) => `missing "${k}"`,
    invalid: (k: string) => `"${k}" is invalid`,
    minLines: (k: string, min: number) => `"${k}" needs at least ${min} line(s)`,
    emptyLine: (k: string, i: number) => `"${k}" line ${i} is empty`,
    noScenario: 'missing simulation content',
    attachmentNoName: (i: number) => `attachment ${i} has no name`,
    needBubble: '"bubbles" needs at least 1 message',
    bubbleFrom: (i: number) => `message ${i}: "from" must be them/me`,
    bubbleEmpty: (i: number) => `message ${i} is empty`,
    noShell: (k: string) => `kind "${k}" has no simulation shell`,
    missingPrompt: 'missing question (prompt)',
    missingExplanation: 'missing explanation',
    missingTranslation: 'missing translation',
    unknownSignal: (c: string[]) => `unknown signal: ${c.join(', ')}`,
    unknownCategory: (c: string) => `unknown category: ${c}`,
    strayHotspot: (c: string[]) => `hotspot uses an unknown signal: ${c.join(', ')}`,
    noteUsedElsewhere: (t: string) =>
      `hotspot explanation copied word-for-word from another quiz: "${t}…" — write one for this quiz`,
  },
};

export type RuleMessages = (typeof RULE_MSG)['vi'];

/**
 * Collects distinct hotspots in scenarioData: span `{text, signal}` or file `{name, signal}`.
 * Returns a map `signal|label` → signal.
 */
export function collectHotspots(
  node: unknown,
  out = new Map<string, string>(),
): Map<string, string> {
  if (Array.isArray(node)) {
    node.forEach((n) => collectHotspots(n, out));
  } else if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    const label =
      typeof o.text === 'string' ? o.text : typeof o.name === 'string' ? o.name : null;
    if (typeof o.signal === 'string' && o.signal && label !== null)
      out.set(`${o.signal}|${label}`, o.signal);
    Object.values(o).forEach((v) => collectHotspots(v, out));
  }
  return out;
}

/** A decoy hotspot: content that looks suspicious but is normal here, plus why (`note`). */
export interface DecoySpot {
  signal: string;
  text: string;
  note: string;
}

/** A correct hotspot: a real warning sign in this scenario, plus why (`note`) — what scammers do and why it matters HERE. */
export interface CorrectSpot {
  signal: string;
  text: string;
  note: string;
}

/** Correct hotspots = hotspots whose signal IS in the answer set. Keyed like the UI (`signal|text`). */
export function collectCorrectSpots(
  node: unknown,
  signalCodes: string[],
  out = new Map<string, CorrectSpot>(),
): CorrectSpot[] {
  if (Array.isArray(node)) {
    node.forEach((n) => collectCorrectSpots(n, signalCodes, out));
  } else if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    const label =
      typeof o.text === 'string' ? o.text : typeof o.name === 'string' ? o.name : null;
    if (
      typeof o.signal === 'string' &&
      o.signal &&
      label !== null &&
      signalCodes.includes(o.signal)
    ) {
      out.set(`${o.signal}|${label}`, {
        signal: o.signal,
        text: label,
        note: typeof o.note === 'string' ? o.note.trim() : '',
      });
    }
    Object.values(o).forEach((v) => collectCorrectSpots(v, signalCodes, out));
  }
  return [...out.values()];
}

/**
 * Decoys = hotspots whose signal is NOT in the answer set (in a safe quiz: every hotspot).
 * Keyed like the UI (`signal|text`), duplicates collapsed.
 */
export function collectDecoys(
  node: unknown,
  signalCodes: string[],
  out = new Map<string, DecoySpot>(),
): DecoySpot[] {
  if (Array.isArray(node)) {
    node.forEach((n) => collectDecoys(n, signalCodes, out));
  } else if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    const label =
      typeof o.text === 'string' ? o.text : typeof o.name === 'string' ? o.name : null;
    if (
      typeof o.signal === 'string' &&
      o.signal &&
      label !== null &&
      !signalCodes.includes(o.signal)
    ) {
      out.set(`${o.signal}|${label}`, {
        signal: o.signal,
        text: label,
        note: typeof o.note === 'string' ? o.note.trim() : '',
      });
    }
    Object.values(o).forEach((v) => collectDecoys(v, signalCodes, out));
  }
  return [...out.values()];
}

/** Copy of scenarioData without `note`s — served before grading so notes can't reveal which spots are right or decoys. */
export function stripNotes<T>(node: T): T {
  if (Array.isArray(node)) return node.map((n) => stripNotes(n)) as T;
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>))
      if (k !== 'note') out[k] = stripNotes(v);
    return out as T;
  }
  return node;
}

/**
 * - Scam: needs answer signals, and every answer signal has a hotspot.
 * - At least 1 decoy is REQUIRED (more is a suggestion — see hotspotHints).
 * - Every hotspot needs a `note` written for THIS scenario (never shared between quizzes): decoys say why it is
 *   normal, correct ones say what the scammer is doing here and why it is a warning sign.
 */
export interface HotspotCount {
  correct: number;
  decoys: number;
}

export function countHotspots(
  scenarioData: unknown,
  signalCodes: string[],
): HotspotCount {
  const spots = [...collectHotspots(scenarioData).values()];
  const correct = spots.filter((s) => signalCodes.includes(s)).length;
  return { correct, decoys: spots.length - correct };
}

/** Minimum length of a hotspot `note` — a real explanation, not a one-word verdict. */
export const MIN_NOTE_LENGTH = 60;

/** Normalises a note for duplicate detection (case, accents kept; whitespace collapsed). */
export const normalizeNote = (note: string) =>
  note.trim().toLowerCase().replace(/\s+/g, ' ');

/** Every hotspot note in scenarioData (trimmed, empty ones skipped). */
export function collectNotes(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    node.forEach((n) => collectNotes(n, out));
  } else if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if (
      typeof o.signal === 'string' &&
      o.signal &&
      typeof o.note === 'string' &&
      o.note.trim()
    )
      out.push(o.note.trim());
    Object.values(o).forEach((v) => collectNotes(v, out));
  }
  return out;
}

/**
 * How strict the checks are:
 * - `basic`: what a quiz needs to work (answer signals exist and are clickable). Admin UI edits use this.
 * - `full`: plus the authoring-quality rules (decoys, per-quiz notes, note length, no repeats) — for content
 *   generated by an agent through the data CLI.
 */
export type RuleMode = 'basic' | 'full';

export function checkQuizHotspots(
  args: { isScam: boolean; signalCodes: string[]; scenarioData: unknown },
  locale: Locale = 'vi',
  mode: RuleMode = 'full',
): string[] {
  const m = RULE_MSG[locale];
  const errors: string[] = [];
  const spots = [...collectHotspots(args.scenarioData).values()];
  const correct = spots.filter((s) => args.signalCodes.includes(s));
  if (args.isScam && args.signalCodes.length === 0) errors.push(m.scamNeedsSignal);
  const missing = args.signalCodes.filter((c) => !correct.includes(c));
  if (missing.length) errors.push(m.signalNoHotspot(missing));
  if (mode === 'basic') return errors;
  const noNote = collectDecoys(args.scenarioData, args.signalCodes).filter(
    (d) => !d.note,
  );
  if (noNote.length) errors.push(m.decoyNoNote(noNote.map((d) => d.text)));
  const noCorrectNote = collectCorrectSpots(args.scenarioData, args.signalCodes).filter(
    (d) => !d.note,
  );
  if (noCorrectNote.length)
    errors.push(m.correctNoNote(noCorrectNote.map((d) => d.text)));
  if (spots.length === correct.length) errors.push(m.needDecoy);
  const notes = collectNotes(args.scenarioData);
  const tooShort = notes.filter((n) => n.length < MIN_NOTE_LENGTH);
  if (tooShort.length)
    errors.push(
      m.noteTooShort(
        MIN_NOTE_LENGTH,
        tooShort.map((n) => n.slice(0, 30)),
      ),
    );
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const n of notes) (seen.has(normalizeNote(n)) ? dup : seen).add(normalizeNote(n));
  if (dup.size) errors.push(m.noteDuplicate([...dup].map((n) => n.slice(0, 30))));
  return errors;
}

/** Non-blocking suggestions (data CLI). */
export function hotspotHints(
  args: { signalCodes: string[]; scenarioData: unknown },
  locale: Locale = 'vi',
): string[] {
  const m = RULE_MSG[locale];
  const hints: string[] = [];
  const { correct, decoys } = countHotspots(args.scenarioData, args.signalCodes);
  if (decoys === 0) hints.push(m.hintNoDecoy);
  else if (Math.abs(correct - decoys) > 1) hints.push(m.hintUnbalanced(decoys, correct));
  const perSignal = new Map<string, number>();
  for (const sig of collectHotspots(args.scenarioData).values())
    if (args.signalCodes.includes(sig)) perSignal.set(sig, (perSignal.get(sig) ?? 0) + 1);
  const single = args.signalCodes.filter((c) => perSignal.get(c) === 1);
  if (single.length > 1 && single.length === args.signalCodes.length)
    hints.push(m.hintSingle);
  return hints;
}

// ─── scenarioData structure checks per shell kind ───

type Obj = Record<string, unknown>;

function isSpan(v: unknown): boolean {
  if (typeof v === 'string') return v.trim().length > 0;
  return (
    !!v &&
    typeof v === 'object' &&
    typeof (v as Obj).text === 'string' &&
    ((v as Obj).text as string).trim().length > 0
  );
}

function needSpan(o: Obj, key: string, errors: string[], m: RuleMessages) {
  if (!isSpan(o[key])) errors.push(m.missing(key));
}

function optSpan(o: Obj, key: string, errors: string[], m: RuleMessages) {
  if (o[key] !== undefined && o[key] !== '' && !isSpan(o[key]))
    errors.push(m.invalid(key));
}

function needSpanList(o: Obj, key: string, errors: string[], m: RuleMessages, min = 1) {
  const v = o[key];
  if (!Array.isArray(v) || v.length < min) {
    errors.push(m.minLines(key, min));
    return;
  }
  v.forEach((s, i) => {
    if (!isSpan(s)) errors.push(m.emptyLine(key, i + 1));
  });
}

function optSpanList(o: Obj, key: string, errors: string[], m: RuleMessages) {
  if (o[key] === undefined) return;
  needSpanList(o, key, errors, m, 0);
}

export function checkScenarioShape(
  kind: string,
  data: unknown,
  locale: Locale = 'vi',
): string[] {
  const m = RULE_MSG[locale];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [m.noScenario];
  const o = data as Obj;
  const errors: string[] = [];
  switch (kind) {
    case QuizKind.EMAIL_INSPECTION:
      needSpan(o, 'senderName', errors, m);
      needSpan(o, 'senderAddress', errors, m);
      needSpan(o, 'subject', errors, m);
      needSpanList(o, 'body', errors, m);
      if (o.attachments !== undefined) {
        if (!Array.isArray(o.attachments)) errors.push(m.invalid('attachments'));
        else
          o.attachments.forEach((a, i) => {
            if (
              !a ||
              typeof a !== 'object' ||
              typeof (a as Obj).name !== 'string' ||
              !((a as Obj).name as string).trim()
            ) {
              errors.push(m.attachmentNoName(i + 1));
            }
          });
      }
      break;
    case QuizKind.WEB_INSPECTION:
      needSpan(o, 'urlBar', errors, m);
      needSpanList(o, 'body', errors, m);
      optSpanList(o, 'buttons', errors, m);
      break;
    case QuizKind.SMS_INSPECTION:
      needSpan(o, 'sender', errors, m);
      needSpanList(o, 'messages', errors, m);
      break;
    case QuizKind.CHAT_INSPECTION:
      needSpan(o, 'contactName', errors, m);
      if (!Array.isArray(o.bubbles) || o.bubbles.length === 0) errors.push(m.needBubble);
      else
        o.bubbles.forEach((b, i) => {
          const bb = (b ?? {}) as Obj;
          if (bb.from !== 'them' && bb.from !== 'me') errors.push(m.bubbleFrom(i + 1));
          if (!isSpan(bb.text)) errors.push(m.bubbleEmpty(i + 1));
        });
      break;
    case QuizKind.QR_INSPECTION:
      optSpan(o, 'posterText', errors, m);
      needSpan(o, 'decodedUrl', errors, m);
      break;
    case QuizKind.FILE_INSPECTION:
      needSpan(o, 'fileName', errors, m);
      optSpanList(o, 'body', errors, m);
      break;
    case QuizKind.APP_CONSENT:
    case QuizKind.OAUTH_CONSENT:
      needSpan(o, 'appName', errors, m);
      optSpan(o, 'publisher', errors, m);
      needSpanList(o, 'permissions', errors, m);
      break;
    default:
      errors.push(m.noShell(kind));
  }
  return errors;
}
