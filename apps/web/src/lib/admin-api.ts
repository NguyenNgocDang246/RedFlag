// Client for /api/admin/* (Phase 3B). Uses apiFetch: auth cookie + auto refresh on 401.
import { apiFetch } from './api';

export type ContentStatus = 'draft' | 'published';

/** Admin error: message + issue list (422 when a quiz isn't ready to publish). */
export class AdminError extends Error {
  constructor(
    public status: number,
    message: string,
    public issues: string[] = [],
  ) {
    super(message);
  }
}

/** Admin UI language (?locale=) — the API localizes validation messages from Accept-Language. */
const uiLocale = (): 'en' | 'vi' =>
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('locale') === 'vi'
    ? 'vi'
    : 'en';

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(`/admin${path}`, {
    method,
    headers: { 'Accept-Language': uiLocale() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data.message)
      ? data.message.join('; ')
      : String(data.message ?? res.statusText);
    throw new AdminError(res.status, msg, Array.isArray(data.issues) ? data.issues : []);
  }
  return data as T;
}

// ─── Category / Signal ───

export interface CategoryText {
  name: string;
  description?: string;
}

export interface AdminCategory {
  id: string;
  code: string;
  impersonates: string[];
  order: number;
  translations: { en: CategoryText; vi: CategoryText };
  usage: { quiz: number; templates: number };
}

export interface CategoryInput {
  code?: string;
  impersonates: string[];
  order: number;
  translations: { en: CategoryText; vi: CategoryText };
}

export interface SignalText {
  name: string;
  explanation: string;
}

export interface AdminSignal {
  id: string;
  code: string;
  translations: { en: SignalText; vi: SignalText };
  usage: { quiz: number; variants: number; hotspots: number };
}

export interface SignalInput {
  code?: string;
  translations: { en: SignalText; vi: SignalText };
}

export const listCategories = () => call<AdminCategory[]>('GET', '/categories');
export const createCategory = (b: CategoryInput) =>
  call<{ id: string }>('POST', '/categories', b);
export const updateCategory = (id: string, b: CategoryInput) => {
  const { code: _code, ...rest } = b;
  return call<{ id: string }>('PATCH', `/categories/${id}`, rest);
};
export const deleteCategory = (id: string) =>
  call<{ ok: true }>('DELETE', `/categories/${id}`);

export const listSignals = () => call<AdminSignal[]>('GET', '/signals');
export const createSignal = (b: SignalInput) =>
  call<{ id: string }>('POST', '/signals', b);
export const updateSignal = (id: string, b: SignalInput) => {
  const { code: _code, ...rest } = b;
  return call<{ id: string }>('PATCH', `/signals/${id}`, rest);
};
export const deleteSignal = (id: string) =>
  call<{ ok: true }>('DELETE', `/signals/${id}`);

// ─── Brand handbook ───

/** Official contact channels — each channel is a list. */
export const BRAND_CHANNELS = [
  'websites',
  'emailDomains',
  'smsSenders',
  'hotlines',
  'apps',
  'socialPages',
  'paymentAccounts',
  'legalNames',
  'taxCodes',
  'addresses',
  'shortCodes',
] as const;
export type BrandChannel = (typeof BRAND_CHANNELS)[number];

/** One brand set per locale (matches the brands in that locale's quizzes). */
export interface BrandInput extends Record<BrandChannel, string[]> {
  code?: string;
  locale?: 'en' | 'vi';
  name: string;
  description: string;
  categoryCode: string | null;
  order: number;
  status: ContentStatus;
}

export interface AdminBrand extends BrandInput {
  id: string;
  code: string;
  locale: 'en' | 'vi';
}

export const listBrands = () => call<AdminBrand[]>('GET', '/brands');
export const createBrand = (b: BrandInput) => call<{ id: string }>('POST', '/brands', b);
/** Code + locale are fixed after creation. */
export const updateBrand = (id: string, b: BrandInput) => {
  const { code: _code, locale: _locale, ...rest } = b;
  return call<{ id: string }>('PATCH', `/brands/${id}`, rest);
};
export const deleteBrand = (id: string) => call<{ ok: true }>('DELETE', `/brands/${id}`);

// ─── Quizzes ───

export interface QuizText {
  /** Neutral library title — must not reveal the answer. */
  title?: string;
  prompt: string;
  explanation: string;
  scenario?: string;
  scenarioData: Record<string, unknown>;
}

export interface QuizInput {
  kind: string;
  isScam: boolean;
  difficultyLevel: number;
  categoryCode: string | null;
  isPublic: boolean;
  order: number;
  signalCodes: string[];
  translations: { en?: QuizText; vi?: QuizText };
}

export interface AdminQuiz extends Omit<QuizInput, 'translations'> {
  id: string;
  number: number;
  status: ContentStatus;
  translations: { en: QuizText | null; vi: QuizText | null };
  issues: string[];
  updatedAt: string;
}

export interface AdminQuizListItem {
  id: string;
  number: number;
  kind: string;
  isScam: boolean;
  isPublic: boolean;
  status: ContentStatus;
  order: number;
  difficultyLevel: number;
  categoryCode: string | null;
  signalCodes: string[];
  prompt: { en: string; vi: string };
  title: { en: string; vi: string };
  issueCount: number;
  attempts: number;
  updatedAt: string;
}

export interface SaveResult {
  id: string;
  status: ContentStatus;
  issues: string[];
}

export interface QuizListFilter {
  kind?: string;
  category?: string;
  status?: string;
  q?: string;
  page?: number;
}

export function listQuiz(f: QuizListFilter) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) qs.set(k, String(v));
  return call<{
    total: number;
    page: number;
    pageSize: number;
    items: AdminQuizListItem[];
  }>('GET', `/quiz?${qs}`);
}
export const getQuiz = (id: string) => call<AdminQuiz>('GET', `/quiz/${id}`);
export const createQuiz = (b: QuizInput) => call<SaveResult>('POST', '/quiz', b);
export const updateQuiz = (id: string, b: QuizInput) =>
  call<SaveResult>('PUT', `/quiz/${id}`, b);
export const setQuizStatus = (id: string, status: ContentStatus) =>
  call<{ id: string; status: ContentStatus }>('PATCH', `/quiz/${id}/status`, { status });
export const deleteQuiz = (id: string) => call<{ ok: true }>('DELETE', `/quiz/${id}`);

// ─── Audit log ───

export interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  changes: unknown;
  actor: string | null;
  createdAt: string;
}

export function listAudit(entity?: string, entityId?: string) {
  const qs = new URLSearchParams();
  if (entity) qs.set('entity', entity);
  if (entityId) qs.set('entityId', entityId);
  return call<AuditRow[]>('GET', `/audit?${qs}`);
}

export const errorText = (e: unknown) =>
  e instanceof Error && e.message
    ? e.message
    : uiLocale() === 'vi'
      ? 'Có lỗi xảy ra'
      : 'Something went wrong';

// ─── Test emails (Phase 4) ───

export interface AdminTestEmailVariant {
  id: string;
  difficulty: number;
  locales: ('en' | 'vi')[];
  subject: string;
  senderName: string;
  signals: string[];
  /** Times sent to learners (not admin previews). Above 0 = locked. */
  sent: number;
}

export interface AdminTestEmail {
  id: string;
  code: string;
  status: ContentStatus;
  title: string;
  category: { code: string; name: string } | null;
  variants: AdminTestEmailVariant[];
}

export interface TestEmailPreview {
  senderName: string;
  subject: string;
  html: string;
  text: string;
}

export interface TestEmailText {
  senderName: string;
  subject: string;
  body: string;
}

export interface TestEmailVariantInput {
  /** Absent = a new email. */
  id?: string;
  difficultyLevel: number;
  signalCodes: string[];
  translations: { en?: TestEmailText; vi?: TestEmailText };
}

export interface TestEmailInput {
  code?: string;
  categoryCode: string;
  titles: { en?: string; vi?: string };
  variants: TestEmailVariantInput[];
  status?: ContentStatus;
}

export interface AdminTestEmailDetail extends TestEmailInput {
  id: string;
  code: string;
  status: ContentStatus;
  variants: (TestEmailVariantInput & { id: string; sent: number })[];
  issues: string[];
  updatedAt: string;
}

export const listTestEmails = () => call<AdminTestEmail[]>('GET', '/test-emails');
export const getTestEmail = (id: string) => call<AdminTestEmailDetail>('GET', `/test-emails/${id}`);
export const createTestEmail = (b: TestEmailInput) => call<SaveResult>('POST', '/test-emails', b);
export const updateTestEmail = (id: string, b: TestEmailInput) =>
  call<SaveResult>('PUT', `/test-emails/${id}`, b);
export const setTestEmailStatus = (id: string, status: ContentStatus) =>
  call<{ id: string; status: ContentStatus }>('PATCH', `/test-emails/${id}/status`, { status });
export const deleteTestEmail = (id: string) => call<{ ok: true }>('DELETE', `/test-emails/${id}`);
export const previewTestEmail = (variantId: string) =>
  call<TestEmailPreview>('GET', `/test-emails/${variantId}/preview`);
/** `locale`: which language of the email to send (default: the admin UI's). */
export const sendTestEmailToMe = (variantId: string, locale?: 'en' | 'vi') =>
  call<{ ok: true; campaignId: string }>(
    'POST',
    `/test-emails/${variantId}/send-to-me`,
    locale ? { locale } : undefined,
  );
