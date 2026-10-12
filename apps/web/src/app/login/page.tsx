import type { Metadata } from 'next';
import { AUTH_T } from '@/lib/i18n';
import { LoginForm } from './login-form';

type Search = { searchParams: Promise<{ locale?: string; next?: string }> };

export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const { locale } = await searchParams;
  return { title: `${AUTH_T[locale === 'vi' ? 'vi' : 'en'].loginBtn} - RedFlag` };
}

export default async function LoginPage({ searchParams }: Search) {
  const { locale, next } = await searchParams;
  return <LoginForm locale={locale === 'vi' ? 'vi' : 'en'} next={next} />;
}
