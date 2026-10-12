import type { Metadata } from 'next';
import { AUTH_T } from '@/lib/i18n';
import { fetchAuthProvidersServer } from '@/lib/server-api';
import { LoginForm, type LoginNotice } from './login-form';

type Search = {
  searchParams: Promise<{ locale?: string; next?: string; unverified?: string; error?: string }>;
};

export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const { locale } = await searchParams;
  return { title: `${AUTH_T[locale === 'vi' ? 'vi' : 'en'].loginBtn} - RedFlag` };
}

export default async function LoginPage({ searchParams }: Search) {
  const { locale, next, unverified, error } = await searchParams;
  // Where Google sign-in sends the browser back to when something went wrong, or the address
  // still needs confirming.
  const notice: LoginNotice | undefined = unverified
    ? 'unverified'
    : error === 'google'
      ? 'google'
      : undefined;
  const providers = await fetchAuthProvidersServer();
  return (
    <LoginForm
      locale={locale === 'vi' ? 'vi' : 'en'}
      next={next}
      google={providers?.google ?? false}
      notice={notice}
    />
  );
}
