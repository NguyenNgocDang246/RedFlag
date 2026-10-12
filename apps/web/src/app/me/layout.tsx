import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { fetchMeServer } from '@/lib/server-api';
import { MeNav } from './me-nav';
import s from './me.module.css';

/**
 * My page: section list on the left, the chosen section on the right (a hamburger menu on phones).
 * Each section is its own route: /me (progress), /me/profile, /me/test, /me/account.
 */
export default async function MeLayout({ children }: { children: ReactNode }) {
  const me = await fetchMeServer();
  // Layouts can't read ?locale= — the login page keeps its own language choice.
  if (!me) redirect(`/login?next=${encodeURIComponent('/me')}`);
  return (
    <div className={s.shell}>
      <aside className={s.side}>
        <MeNav name={me.name} email={me.email} />
      </aside>
      <main className={s.main}>{children}</main>
    </div>
  );
}
