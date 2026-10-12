import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { fetchMeServer } from '@/lib/server-api';
import { AdminGate } from './admin-gate';
import { AdminNav } from './admin-nav';
import s from './admin.module.css';

export const metadata: Metadata = { title: 'Admin - RedFlag', robots: { index: false } };

/**
 * Content admin area (Phase 3B). The server checks permissions before rendering;
 * the API still re-checks the role on every route (AdminGuard) — this is just the UI layer.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const me = await fetchMeServer();
  // The access token may have just expired → let the client try refresh, then reload.
  if (!me) return <AdminGate />;
  if (me.role !== 'admin') notFound();

  return (
    <div className={s.shell}>
      <aside className={s.side}>
        <AdminNav />
      </aside>
      <main className={s.main}>{children}</main>
    </div>
  );
}
