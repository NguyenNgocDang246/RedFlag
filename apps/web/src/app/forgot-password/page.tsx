import type { Metadata } from 'next';
import { AUTH_T } from '@/lib/i18n';
import { ForgotForm } from './forgot-form';

type Search = { searchParams: Promise<{ locale?: string }> };

export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const { locale } = await searchParams;
  return {
    title: `${AUTH_T[locale === 'vi' ? 'vi' : 'en'].forgotTitle} - RedFlag`,
    robots: { index: false },
  };
}

export default async function ForgotPasswordPage({ searchParams }: Search) {
  const { locale } = await searchParams;
  return <ForgotForm locale={locale === 'vi' ? 'vi' : 'en'} />;
}
