import { redirect } from 'next/navigation';
import { fetchFacetsServer, fetchMeServer } from '@/lib/server-api';
import { meMetadata, pickLocale, type MeSearch } from '../page-meta';
import { ProfileForm } from '../profile-form';

export const generateMetadata = meMetadata('profile');

export default async function MeProfilePage({ searchParams }: MeSearch) {
  const locale = pickLocale((await searchParams).locale);
  // The quiz categories double as the training topics to choose from (R6: they are data).
  const [me, facets] = await Promise.all([fetchMeServer(), fetchFacetsServer(locale)]);
  if (!me) redirect('/login?next=/me/profile');
  return <ProfileForm me={me} locale={locale} topics={facets?.categories ?? []} />;
}
