import { redirect } from 'next/navigation';
import { fetchMeServer } from '@/lib/server-api';
import { meMetadata, pickLocale, type MeSearch } from '../page-meta';
import { ProfileForm } from '../profile-form';

export const generateMetadata = meMetadata('profile');

export default async function MeProfilePage({ searchParams }: MeSearch) {
  const locale = pickLocale((await searchParams).locale);
  const me = await fetchMeServer();
  if (!me) redirect('/login?next=/me/profile');
  return <ProfileForm me={me} locale={locale} />;
}
