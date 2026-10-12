'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CircleCheck, LoaderCircle, TriangleAlert } from 'lucide-react';
import { verifyEmail, type Locale } from '@/lib/api';
import { AUTH_T } from '@/lib/i18n';
import { AuthCard, authStyles as s } from '@/components/auth-ui';

/** Opened from the email link: confirms the token once, then shows the result. */
export function VerifyEmail({ locale, token }: { locale: Locale; token?: string }) {
  const t = AUTH_T[locale];
  const [state, setState] = useState<'working' | 'ok' | 'fail'>(token ? 'working' : 'fail');
  // Tokens are single-use — keep the effect from running twice (StrictMode) and re-calling the API.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verifyEmail(token)
      .then(() => setState('ok'))
      .catch(() => setState('fail'));
  }, [token]);

  const loginLink = (
    <Link href={`/login?locale=${locale}`} className={`btn btn-primary btn-lg ${s.submit}`}>
      {t.goLogin}
    </Link>
  );

  if (state === 'working') return <AuthCard icon={<LoaderCircle size={26} className={s.spin} />} title={t.verifying} />;
  if (state === 'ok')
    return (
      <AuthCard icon={<CircleCheck size={26} />} title={t.verifiedTitle} sub={t.verifiedBody}>
        {loginLink}
      </AuthCard>
    );
  return (
    <AuthCard icon={<TriangleAlert size={26} />} title={t.verifyFailTitle} sub={t.verifyFailBody}>
      {loginLink}
    </AuthCard>
  );
}
