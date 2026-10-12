// API URL for client components. Override with NEXT_PUBLIC_API_URL if needed.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type Locale = 'en' | 'vi';

export interface SignalOption {
  code: string;
  name: string;
}

export interface QuizQuestion {
  id: string;
  /** Internal DB number — cursor for "next question" only, never displayed. */
  number: number;
  /** Displayed number (#1, #2…): position among published quizzes. */
  seq: number | null;
  kind: string;
  /** Neutral title (no spoilers). Null → "channel · topic". */
  title: string | null;
  prompt: string;
  scenario: string;
  /** Structured per-channel content + hotspots. Null = legacy quiz, use flat text. */
  scenarioData: unknown;
  isPublic: boolean;
  /** 1 = easy, 2 = medium, 3 = hard. */
  difficulty: number;
  category: { code: string; name: string } | null;
  signalOptions: SignalOption[];
}

/** Practice filter — matches the query of /train and /api/training/quiz. */
export interface QuizFilter {
  category?: string;
  kind?: string;
  signal?: string;
  /** Difficulty 1–3. */
  level?: string;
  /** Reload the current set (comma-separated ids) instead of drawing a new one. */
  ids?: string;
}

/** A practice round (default 10) + unseen questions left, for the "Continue" button. */
export interface QuizSet {
  items: QuizQuestion[];
  remaining: number;
}

/** Quiz counts per group (for the practice picker). */
export interface Facets {
  total: number;
  /** Quizzes guests can't see yet (sign-in required). */
  locked: number;
  kinds: { code: string; count: number }[];
  levels: { level: number; count: number }[];
  categories: { code: string; name: string; description: string; count: number }[];
  signals: { code: string; name: string; count: number }[];
}

export interface SignalInfo {
  code: string;
  name: string;
  explanation: string;
}

export interface QuizResult {
  correctAnswerIsScam: boolean;
  classifyCorrect: boolean;
  matchedSignals: SignalInfo[];
  missedSignals: SignalInfo[];
  wrongSignals: SignalInfo[];
  /** Every decoy hotspot with its per-quiz "why this is normal" note (shown for the ones picked). */
  decoySpots: { signal: string; text: string; note: string }[];
  /** Every correct hotspot with its per-quiz "why this is a red flag" note. */
  correctSpots: { signal: string; text: string; note: string }[];
  explanation: string;
  savedAttempt: boolean;
}

export type LibraryStatus = 'todo' | 'solved' | 'attempted';

/** A library row — NO answers. */
export interface LibraryItem {
  id: string;
  /** Displayed number (#1, #2…), not the DB number. */
  seq: number | null;
  title: string | null;
  kind: string;
  level: number;
  isPublic: boolean;
  /** Guests: question requires sign-in. */
  locked: boolean;
  category: { code: string; name: string } | null;
  /** Null for guests (no history). */
  status: LibraryStatus | null;
}

export interface LibraryPage {
  total: number;
  page: number;
  pageSize: number;
  items: LibraryItem[];
}

/** Query of /library and /api/training/library (kept in the URL). */
export interface LibraryQuery extends QuizFilter {
  page?: string;
  status?: string;
  q?: string;
  sort?: string;
  dir?: string;
}

/** A brand in the handbook. */
export interface Brand {
  code: string;
  name: string;
  description: string;
  category: { code: string; name: string } | null;
  websites: string[];
  emailDomains: string[];
  smsSenders: string[];
  hotlines: string[];
  apps: string[];
  socialPages: string[];
}

/** New practice round (client) — for the "Continue 10 more" button. */
export async function fetchQuizSet(locale: Locale, filter: QuizFilter, exclude: string[]): Promise<QuizSet> {
  const qs = new URLSearchParams({ locale });
  for (const [k, v] of Object.entries(filter)) if (v) qs.set(k, v);
  if (exclude.length) qs.set('exclude', exclude.join(','));
  const res = await apiFetch(`/training/quiz?${qs}`);
  if (!res.ok) throw new Error('Không tải được bài luyện');
  return res.json();
}

export async function fetchBrands(locale: Locale): Promise<Brand[]> {
  const res = await fetch(`${API_URL}/api/training/brands?locale=${locale}`);
  if (!res.ok) throw new Error('Không tải được sổ tay');
  return res.json();
}

export async function answerQuiz(
  id: string,
  locale: Locale,
  answeredScam: boolean,
  selectedSignals: string[],
): Promise<QuizResult> {
  const res = await fetch(`${API_URL}/api/training/quiz/${id}/answer?locale=${locale}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ answeredScam, selectedSignals }),
  });
  if (!res.ok) throw new Error('Chấm điểm thất bại');
  return res.json();
}

let refreshing: Promise<boolean> | null = null;

/**
 * Single-flight refresh: concurrent callers (header + page, StrictMode double effects, parallel 401s)
 * share one POST /auth/refresh — refresh tokens are single-use, so parallel calls would race.
 */
function refreshOnce(): Promise<boolean> {
  refreshing ??= fetch(`${API_URL}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * fetch to the API with the auth cookie. The access token only lives 5 minutes:
 * on 401, get a new one via /auth/refresh exactly once, then retry.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const opts: RequestInit = {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  };
  const res = await fetch(`${API_URL}/api${path}`, opts);
  if (res.status !== 401 || path.startsWith('/auth/')) return res;
  return (await refreshOnce()) ? fetch(`${API_URL}/api${path}`, opts) : res;
}

export interface Me {
  id: string;
  email: string;
  name: string | null;
  occupation: string | null;
  servicesUsed: string[];
  locale: Locale;
  emailVerified: boolean;
  role: 'user' | 'admin';
  training: { interests: string[] };
  test: { enabled: boolean; frequency: string };
}

/** Restores the session when the access token expired: refresh first, then fetch the user. */
export async function restoreSession(): Promise<Me | null> {
  if (!(await refreshOnce())) return null;
  const res = await apiFetch('/auth/me');
  return res.ok ? ((await res.json()) as Me) : null;
}

/** API error with HTTP status + original message (the UI picks a friendly text). */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message.join(' ') : String(data.message ?? '');
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export const login = (email: string, password: string) => postJson<Me>('/auth/login', { email, password });
export const register = (email: string, password: string, locale: Locale) =>
  postJson<{ ok: true }>('/auth/register', { email, password, locale });
export const verifyEmail = (token: string) => postJson<{ ok: true }>('/auth/verify', { token });
export const logout = () => postJson<{ ok: true }>('/auth/logout', {});

// ─── Contest (Phase 3A) ───

/** The open contest question. `skipped` = the previous one was forfeited (reload/leave) or timed out. */
export type ContestCurrent =
  | { finished: true; skipped?: 'forfeit' | 'timeout' }
  | {
      finished: false;
      skipped?: 'forfeit' | 'timeout';
      position: number;
      total: number;
      itemSeconds: number;
      /** ISO time the answer is due. */
      deadline: string;
      question: QuizQuestion;
    };

export interface ContestReviewItem {
  position: number;
  outcome: 'answered' | 'forfeited' | 'timeout';
  points: number;
  maxPoints: number;
  answeredScam: boolean | null;
  selectedSignals: string[];
  /** Hotspot keys picked ("SIGNAL|text"). */
  selectedSpots: string[];
  question: QuizQuestion;
  review: Omit<QuizResult, 'savedAttempt'>;
}

export interface ContestResult {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  score: number;
  maxScore: number;
  total: number;
  correct: number;
  falseAlarms: number;
  missedScams: number;
  decoyPicks: number;
  /** Weakest first. */
  signals: { code: string; name: string; spotted: number; missed: number }[];
  items: ContestReviewItem[];
}

export interface ContestHistory {
  active: { id: string; startedAt: string } | null;
  items: { id: string; startedAt: string; finishedAt: string | null; score: number; maxScore: number; total: number }[];
}

async function contestCall<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(`/contest${path}`, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, String(data.message ?? ''));
  return data as T;
}

export const startContest = (locale: Locale) =>
  contestCall<{ id: string }>(`?locale=${locale}`, { method: 'POST' });

/** Each call for a question already shown skips it — call once per question. */
export const fetchContestCurrent = (id: string) =>
  contestCall<ContestCurrent>(`/${encodeURIComponent(id)}/current`, { method: 'POST' });

export const answerContest = (
  id: string,
  body: { position: number; answeredScam: boolean; selectedSignals: string[]; selectedSpots: string[] },
) =>
  contestCall<{ finished: boolean; timedOut: boolean }>(`/${encodeURIComponent(id)}/answer`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

// ─── My page (/me) ───

export interface Progress {
  practice: { answers: number; scenarios: number };
  /** Practice answers + contest questions. */
  answered: number;
  correct: number;
  falseAlarms: number;
  missedScams: number;
  contests: {
    count: number;
    /** Best score in %, among recent rounds. */
    best: number | null;
    recent: { id: string; finishedAt: string | null; score: number; maxScore: number }[];
  };
  /** Most-missed first. */
  signals: { code: string; name: string; spotted: number; missed: number }[];
}

export type TestFrequencyLevel = 'low' | 'medium' | 'high';

export interface TestStatus {
  state: 'on' | 'paused' | 'off';
  frequency: TestFrequencyLevel | null;
}

export interface TestWarning {
  locale: Locale;
  warning: string;
  confirmPhrase: string;
}

export interface DeviceSession {
  id: string;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data.message) ? data.message.join(' ') : String(data.message ?? '');
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const updateProfile = (body: {
  name?: string;
  occupation?: string;
  servicesUsed?: string[];
  locale?: Locale;
}) => call<Me>('/auth/me', json('PATCH', body));

export const changePassword = (currentPassword: string, newPassword: string) =>
  call<{ ok: true }>('/auth/password', json('POST', { currentPassword, newPassword }));

export const fetchSessions = () => call<DeviceSession[]>('/auth/sessions');
export const revokeSession = (id: string) => call<{ ok: true }>(`/auth/sessions/${encodeURIComponent(id)}`, json('DELETE'));
export const revokeOtherSessions = () => call<{ ok: true }>('/auth/sessions/revoke-others', json('POST'));

export const fetchTestWarning = (locale: Locale) => call<TestWarning>(`/onboarding/test-warning?locale=${locale}`);
export const enableTest = (frequency: TestFrequencyLevel, confirmationText: string, locale: Locale) =>
  call<{ enabled: true }>('/test/enable', json('POST', { frequency, confirmationText, locale }));
export const setTestFrequency = (frequency: TestFrequencyLevel) =>
  call<TestStatus>('/test/frequency', json('PATCH', { frequency }));
export const pauseTest = () => call<unknown>('/test/pause', json('POST'));
export const resumeTest = () => call<unknown>('/test/resume', json('POST'));
export const unsubscribeTest = () => call<unknown>('/test/unsubscribe', json('POST'));
export const fetchTestStatus = () => call<TestStatus>('/test');
