import { fetchTestStatusServer } from '@/lib/server-api';
import { meMetadata, pickLocale, type MeSearch } from '../page-meta';
import { TestSettings } from '../test-settings';

export const generateMetadata = meMetadata('test');

export default async function MeTestPage({ searchParams }: MeSearch) {
  const locale = pickLocale((await searchParams).locale);
  const status = await fetchTestStatusServer();
  return (
    <TestSettings initial={status ?? { state: 'off', frequency: null }} locale={locale} />
  );
}
