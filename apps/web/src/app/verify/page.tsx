import type { Metadata } from 'next';
import { VerifyEmail } from './verify-email';

type Search = { searchParams: Promise<{ locale?: string; token?: string }> };

export const metadata: Metadata = { title: 'RedFlag', robots: { index: false } };

export default async function VerifyPage({ searchParams }: Search) {
  const { locale, token } = await searchParams;
  return <VerifyEmail locale={locale === 'vi' ? 'vi' : 'en'} token={token} />;
}
