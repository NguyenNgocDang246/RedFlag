import { NextResponse } from 'next/server';

/**
 * BFF health route — checks both web and API (see architecture §3, §9).
 */
export async function GET() {
  const apiUrl = process.env.API_PUBLIC_URL ?? 'http://localhost:4000';

  let api: unknown = { status: 'unknown' };
  try {
    const res = await fetch(`${apiUrl}/api/health`, { cache: 'no-store' });
    api = await res.json();
  } catch {
    api = { status: 'unreachable' };
  }

  return NextResponse.json({
    status: 'ok',
    service: 'redflag-web',
    api,
    timestamp: new Date().toISOString(),
  });
}
