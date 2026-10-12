import type { Metadata } from 'next';
import { AUTH_T } from '@/lib/i18n';
import { fetchAuthProvidersServer } from '@/lib/server-api';
import { RegisterForm } from './register-form';

type Search = { searchParams: Promise<{ locale?: string }> };

export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const { locale } = await searchParams;
  return { title: `${AUTH_T[locale === 'vi' ? 'vi' : 'en'].registerBtn} - RedFlag` };
}

export default async function RegisterPage({ searchParams }: Search) {
  const { locale } = await searchParams;
  const providers = await fetchAuthProvidersServer();
  return (
    <RegisterForm locale={locale === 'vi' ? 'vi' : 'en'} google={providers?.google ?? false} />
  );
}
