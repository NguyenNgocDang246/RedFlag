import { NextResponse, type NextRequest } from 'next/server';

// Matches the cookie names in apps/api/src/identity/auth/jwt-auth.guard.ts.
const ACCESS_COOKIE = 'rf_access';
const SESSION_MARKER_COOKIE = 'rf_session';
// Loop guard: just came back from refresh and still no access token (e.g. the cookie can't reach the web).
const RETRY_GUARD_COOKIE = 'rf_retry';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Access token (5 min) expired → the browser drops rf_access. The server can't see rf_refresh
 * (path /api/auth), so it can't refresh itself; instead it sends the BROWSER to
 * GET /api/auth/refresh — the browser attaches rf_refresh, the API rotates and redirects back.
 * So the page renders the right signed-in state from the server, and the refresh token only goes to /api/auth.
 */
export function middleware(req: NextRequest) {
  const { cookies, headers } = req;
  if (req.method !== 'GET') return NextResponse.next();
  // Access token valid → nothing to do; drop the loop guard once the refresh worked, otherwise it
  // would block the next refresh for its whole lifetime.
  if (cookies.has(ACCESS_COOKIE)) {
    const res = NextResponse.next();
    if (cookies.has(RETRY_GUARD_COOKIE)) res.cookies.delete(RETRY_GUARD_COOKIE);
    return res;
  }
  // Real guest (no session flag), or just came back from a refresh that didn't help → leave as is.
  if (!cookies.has(SESSION_MARKER_COOKIE) || cookies.has(RETRY_GUARD_COOKIE)) {
    return NextResponse.next();
  }
  // Prefetch: leave as is (dynamic page, Next doesn't reuse prefetched data for display) —
  // avoids firing several concurrent refreshes with the same refresh token.
  if (headers.has('next-router-prefetch') || headers.get('purpose') === 'prefetch') {
    return NextResponse.next();
  }
  // Client-side navigation (RSC requests use fetch and can't follow a redirect to the API):
  // return a non-RSC response → Next falls back to a full page load, which hits the branch below.
  // Next hides the `RSC` header and `_rsc` param from middleware, so rely on the browser-set
  // `Sec-Fetch-Dest`: `document` = real page load, anything else (`empty`) = fetch.
  const dest = headers.get('sec-fetch-dest');
  if (dest && dest !== 'document') {
    return new NextResponse(null, { status: 204 });
  }

  const target = new URL('/api/auth/refresh', API_URL);
  target.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
  const res = NextResponse.redirect(target);
  res.cookies.set(RETRY_GUARD_COOKIE, '1', { path: '/', maxAge: 30, httpOnly: true, sameSite: 'lax' });
  return res;
}

export const config = {
  // Pages only; skip static assets, images, internal route handlers.
  matcher: ['/((?!_next/|api/|favicon\\.ico|icon\\.svg|.*\\.[a-z0-9]+$).*)'],
};
