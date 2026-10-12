'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { restoreSession } from '@/lib/api';
import s from './admin.module.css';
import { useAdmin } from './use-admin';

/** Server saw no session: try refreshing once; reload on success, otherwise go to sign-in. */
export function AdminGate() {
  const router = useRouter();
  const { t, locale, href } = useAdmin();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    restoreSession()
      .then((me) => {
        if (me) router.refresh();
        else
          router.replace(
            `/login?${new URLSearchParams({ locale, next: href('/admin') })}`,
          );
      })
      .catch(() => setOffline(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  return <main className={s.gate}>{offline ? t.gate.offline : t.gate.checking}</main>;
}
