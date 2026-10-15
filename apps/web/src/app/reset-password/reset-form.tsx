'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleCheck, KeyRound, TriangleAlert } from 'lucide-react';
import { ApiError, resetPassword, type Locale } from '@/lib/api';
import { AUTH_T } from '@/lib/i18n';
import { AuthCard, authStyles as s, PasswordField } from '@/components/auth-ui';

/** Sets a new password from a mailed link. */
export function ResetForm({ locale, token }: { locale: Locale; token?: string }) {
  const t = AUTH_T[locale];
  const router = useRouter();
  // Held from the first render: the token is taken out of the URL right away (below).
  const [link] = useState(token);
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [state, setState] = useState<'form' | 'saving' | 'done' | 'dead'>(link ? 'form' : 'dead');
  const [error, setError] = useState<string | null>(null);

  // A token in the address bar ends up in history and in any referrer — carry it in memory instead.
  useEffect(() => {
    if (token) router.replace(`/reset-password?locale=${locale}`);
  }, [token, locale, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError(t.errShortPassword);
    if (password !== again) return setError(t.errPasswordMismatch);
    setState('saving');
    setError(null);
    try {
      await resetPassword(link as string, password);
      setState('done');
    } catch (err) {
      // 400 = expired, already used, or not ours; there is nothing to retype, so say so plainly.
      if (err instanceof ApiError && err.status === 400) return setState('dead');
      setError(err instanceof ApiError && err.status === 429 ? t.errTooMany : t.errGeneric);
      setState('form');
    }
  };

  const loginLink = (
    <Link href={`/login?locale=${locale}`} className={`btn btn-primary btn-lg ${s.submit}`}>
      {t.goLogin}
    </Link>
  );

  if (state === 'done') {
    return (
      <AuthCard icon={<CircleCheck size={26} />} title={t.resetDoneTitle} sub={t.resetDoneBody}>
        {loginLink}
      </AuthCard>
    );
  }

  if (state === 'dead') {
    return (
      <AuthCard icon={<TriangleAlert size={26} />} title={t.resetDeadTitle} sub={t.resetDeadBody}>
        <Link
          href={`/forgot-password?locale=${locale}`}
          className={`btn btn-primary btn-lg ${s.submit}`}
        >
          {t.tryAgain}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard icon={<KeyRound size={26} />} title={t.resetTitle} sub={t.resetSub}>
      <form onSubmit={submit} noValidate>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <PasswordField
          label={t.password}
          hint={t.passwordHint}
          value={password}
          onChange={setPassword}
          placeholder={t.newPasswordPlaceholder}
          showText={t.showPassword}
          hideText={t.hidePassword}
          autoComplete="new-password"
        />
        <PasswordField
          label={t.confirmPassword}
          value={again}
          onChange={setAgain}
          placeholder={t.confirmPasswordPlaceholder}
          showText={t.showPassword}
          hideText={t.hidePassword}
          autoComplete="new-password"
        />
        <button
          className={`btn btn-primary btn-lg ${s.submit}`}
          type="submit"
          disabled={state === 'saving'}
        >
          {state === 'saving' ? t.working : t.resetBtn}
        </button>
      </form>
    </AuthCard>
  );
}
