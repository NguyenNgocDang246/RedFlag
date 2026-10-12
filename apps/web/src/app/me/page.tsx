import { fetchProgressServer } from '@/lib/server-api';
import { meMetadata, pickLocale, type MeSearch } from './page-meta';
import { ProgressSection } from './progress-section';

export const generateMetadata = meMetadata('progress');

export default async function MeProgressPage({ searchParams }: MeSearch) {
  const locale = pickLocale((await searchParams).locale);
  return <ProgressSection progress={await fetchProgressServer(locale)} locale={locale} />;
}
