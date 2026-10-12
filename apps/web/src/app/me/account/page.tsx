import { redirect } from 'next/navigation';
import { fetchMeServer } from '@/lib/server-api';
import { AccountSection } from '../account-section';
import { meMetadata, pickLocale, type MeSearch } from '../page-meta';

export const generateMetadata = meMetadata('account');

export default async function MeAccountPage({ searchParams }: MeSearch) {
  const locale = pickLocale((await searchParams).locale);
  const me = await fetchMeServer();
  if (!me) redirect('/login?next=/me/account');
  return <AccountSection me={me} locale={locale} />;
}
