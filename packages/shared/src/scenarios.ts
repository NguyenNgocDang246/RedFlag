/**
 * On-site simulated scenarios (Training part b) + in-place inspection (hotspots).
 *
 * Each channel's content renders in a realistic "shell" (email/SMS/chat/web...).
 * Some elements in the shell are HOTSPOTS — the user taps suspicious spots instead of ticking a list.
 * Each hotspot carries one SignalCode; tapping selects it. Grading is still decided by the
 * question's correct signal set (see grading) — hotspots are only an INPUT method.
 *
 * In SAFE scenarios hotspots are "decoys": suspicious-looking elements whose signal is
 * NOT in the correct set → tapping one is a false positive (R11).
 */
/**
 * Signal codes in scenarioData are free strings: signals are DATA (signals table, admins
 * can add more — R6). `SignalCode` in ./signals is only the default seed set.
 */
type SignalRef = string;

/** Quiz kind = shell kind. Matches the QuizKind enum in Prisma. */
export const QuizKind = {
  EMAIL_INSPECTION: 'email_inspection',
  POPUP: 'popup',
  OAUTH_CONSENT: 'oauth_consent',
  SMS_INSPECTION: 'sms_inspection',
  CHAT_INSPECTION: 'chat_inspection',
  WEB_INSPECTION: 'web_inspection',
  QR_INSPECTION: 'qr_inspection',
  FILE_INSPECTION: 'file_inspection',
  APP_CONSENT: 'app_consent',
} as const;

export type QuizKind = (typeof QuizKind)[keyof typeof QuizKind];

export const ALL_QUIZ_KINDS = Object.values(QuizKind);

/** Shell kinds editable in admin (popup has no shell yet). */
export const EDITABLE_QUIZ_KINDS: QuizKind[] = ALL_QUIZ_KINDS.filter((k) => k !== QuizKind.POPUP);

/**
 * Span = a piece of content. Plain string = not tappable; object = HOTSPOT carrying a signal.
 * `href` makes it a link whose real destination only shows on hover/tap, like a browser's status bar.
 * `note` (DECOYS only, required there): why this piece is normal in THIS scenario — shown after grading
 * when the learner picked it. Written per quiz, never shared. Stripped before the quiz is served.
 * Kept minimal so seed authors can write it by hand.
 */
export type Span = string | { text: string; signal: SignalRef; href?: string; note?: string };

export function isHotspot(s: Span): s is { text: string; signal: SignalRef; href?: string; note?: string } {
  return typeof s === 'object' && s !== null && 'signal' in s;
}

/** Plain text of a Span (for avatars, aria...). */
export function spanText(s: Span): string {
  return typeof s === 'string' ? s : s.text;
}

// ─── Per-shell data (stored in QuizQuestionTranslation.scenarioData) ───

export interface EmailScenario {
  senderName: Span;
  senderAddress: Span; // where SENDER_MISMATCH / LOOKALIKE_DOMAIN shows up
  to?: string;
  time?: string; // e.g. "09:12"
  subject: Span;
  body: Span[]; // one entry per paragraph
  attachments?: { name: string; size?: string; signal?: SignalRef; note?: string }[];
}

export interface WebScenario {
  urlBar: Span; // address bar — main hotspot for inspecting the domain
  title?: string;
  body: Span[];
  buttons?: Span[];
}

export interface SmsScenario {
  sender: Span; // displayed brand name
  messages: Span[]; // sender's bubbles
}

export interface ChatScenario {
  contactName: Span;
  bubbles: { from: 'them' | 'me'; text: Span }[];
}

export interface QrScenario {
  posterText?: Span;
  decodedUrl: Span; // URL revealed after "scanning"
}

export interface FileScenario {
  fileName: Span;
  prompt?: string; // e.g. "Enable content"
  body?: Span[];
}

export interface AppScenario {
  appName: Span;
  publisher?: Span; // OAuth: developer line · app install: Play Protect notice
  permissions: Span[]; // suspicious permissions carrying signals (UNTRUSTED_APP...)
}

/** Quiz content is either a flat string (legacy) or structured data (hotspot quizzes). */
export type ScenarioData =
  | EmailScenario
  | WebScenario
  | SmsScenario
  | ChatScenario
  | QrScenario
  | FileScenario
  | AppScenario;
