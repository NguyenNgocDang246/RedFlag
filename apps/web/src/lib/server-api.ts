import { cookies } from 'next/headers';
import { cache } from 'react';
import type {
  Brand,
  CaughtContent,
  ContestHistory,
  ContestResult,
  Facets,
  LibraryPage,
  LibraryQuery,
  Me,
  Progress,
  QuizFilter,
  QuizQuestion,
  QuizSet,
  TestStatus,
  TestWarning,
} from './api';

// Server-side (SSR) fetches — use the internal API URL to render crawlable HTML (SEO).
const SERVER_API_URL = process.env.API_PUBLIC_URL ?? 'http://localhost:4000';

/** Forwards the user's auth cookie to the API so SSR sees the right content (guest vs user). */
async function authHeaders(): Promise<HeadersInit> {
  const cookie = (await cookies()).toString();
  return cookie ? { cookie } : {};
}

/** GET JSON from the API (with cookie). Null on error — the page shows an empty state. */
async function getJson<T>(path: string, params: Record<string, string | undefined> = {}): Promise<T | null> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  // Outside the try: during `next build`, cookies() throws to mark the page dynamic, and that
  // signal must reach Next rather than be swallowed as a failed fetch.
  const headers = await authHeaders();
  try {
    const res = await fetch(`${SERVER_API_URL}/api${path}?${qs}`, { cache: 'no-store', headers });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** A practice round (default 10, drawn by the server). */
export async function fetchQuizServer(locale: 'en' | 'vi', filter: QuizFilter = {}): Promise<QuizSet> {
  return (await getJson<QuizSet>('/training/quiz', { locale, ...filter })) ?? { items: [], remaining: 0 };
}

/** One question by id (opened from the library). Null if missing / sign-in required. */
export function fetchQuizByIdServer(locale: 'en' | 'vi', id: string): Promise<QuizQuestion | null> {
  return getJson<QuizQuestion>(`/training/quiz/${encodeURIComponent(id)}`, { locale });
}

/** Next question by sequence number within the library filters. */
export function fetchNextQuizServer(after: number, filter: QuizFilter = {}): Promise<{ id: string; number: number } | null> {
  return getJson('/training/library/next', { after: String(after), ...filter });
}

export function fetchLibraryServer(locale: 'en' | 'vi', query: LibraryQuery): Promise<LibraryPage | null> {
  return getJson<LibraryPage>('/training/library', { locale, ...query });
}

export async function fetchBrandsServer(locale: 'en' | 'vi'): Promise<Brand[]> {
  return (await getJson<Brand[]>('/training/brands', { locale })) ?? [];
}

/**
 * Current user on the server (so header + content render correctly up front). Null if signed out.
 * `cache`: layout and page both call this in one request → only one API call.
 */
export const fetchMeServer = cache(async function fetchMeServer(): Promise<Me | null> {
  return getJson<Me>('/auth/me');
});

/** Quiz counts by channel / topic / signal / difficulty (filtered by `level` if given). Null on API error. */
export function fetchFacetsServer(locale: 'en' | 'vi', level?: string): Promise<Facets | null> {
  return getJson<Facets>('/training/facets', { locale, level });
}

/** Contest history (signed-in only). Null when signed out / API error. */
export function fetchContestHistoryServer(): Promise<ContestHistory | null> {
  return getJson<ContestHistory>('/contest/history');
}

/** A finished contest round with its review. Null if missing, not finished or not yours. */
export function fetchContestResultServer(locale: 'en' | 'vi', id: string): Promise<ContestResult | null> {
  return getJson<ContestResult>(`/contest/${encodeURIComponent(id)}/result`, { locale });
}

/** "My progress" (practice + contest). Null when signed out / API error. */
export function fetchProgressServer(locale: 'en' | 'vi'): Promise<Progress | null> {
  return getJson<Progress>('/progress', { locale });
}

/** Email test settings state. Null when signed out / API error. */
export function fetchTestStatusServer(): Promise<TestStatus | null> {
  return getJson<TestStatus>('/test');
}

/**
 * Content for the "you clicked it" page, looked up by the token from the email link.
 * Unauthenticated by design: the reader is coming straight from their mail app.
 */
export function fetchCaughtServer(token: string, locale: 'en' | 'vi'): Promise<CaughtContent | null> {
  return getJson<CaughtContent>(`/t/${encodeURIComponent(token)}/teach`, { locale });
}

/** The report instructions users agree to, with the real addresses filled in. Public endpoint. */
/** Which sign-in methods the API offers. null (API down) hides the Google button. */
export function fetchAuthProvidersServer(): Promise<{ google: boolean } | null> {
  return getJson<{ google: boolean }>('/auth/providers');
}

export function fetchTestWarningServer(locale: 'en' | 'vi'): Promise<TestWarning | null> {
  return getJson<TestWarning>('/onboarding/test-warning', { locale });
}
