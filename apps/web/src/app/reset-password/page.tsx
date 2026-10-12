import type { Metadata } from 'next';
import { AUTH_T } from '@/lib/i18n';
import { ResetForm } from './reset-form';

type Search = { searchParams: Promise<{ locale?: string; token?: string }> };

export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const { locale } = await searchParams;
  return {
    title: `${AUTH_T[locale === 'vi' ? 'vi' : 'en'].resetTitle} - RedFlag`,
    robots: { index: false },
  };
}

export default async function ResetPasswordPage({ searchParams }: Search) {
  const { locale, token } = await searchParams;
  return <ResetForm locale={locale === 'vi' ? 'vi' : 'en'} token={token} />;
}
