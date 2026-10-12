'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { ApiError, login, type Locale } from '@/lib/api';
import { AUTH_T } from '@/lib/i18n';
import { AuthCard, authStyles as s, EmailField, isEmail, PasswordField } from '@/components/auth-ui';

export function LoginForm({ locale, next }: { locale: Locale; next?: string }) {
  const t = AUTH_T[locale];
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) return setError(t.errEmail);
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      // Only allow redirecting back to internal paths.
      const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : `/practice?locale=${locale}`;
      router.push(dest);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(/verify/i.test(err.message) ? t.errNotVerified : t.errInvalid);
      } else {
        setError(t.errGeneric);
      }
      setBusy(false);
    }
  };

  return (
    <AuthCard icon={<KeyRound size={26} />} title={t.loginTitle} sub={t.loginSub}>
      <form onSubmit={submit} noValidate>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <EmailField label={t.email} value={email} onChange={setEmail} />
        <PasswordField
          label={t.password}
          value={password}
          onChange={setPassword}
          showText={t.showPassword}
          hideText={t.hidePassword}
          autoComplete="current-password"
        />
        <button className={`btn btn-primary btn-lg ${s.submit}`} type="submit" disabled={busy}>
          {busy ? t.working : t.loginBtn}
        </button>
      </form>
      <p className={s.alt}>
        {t.noAccount} <Link href={`/register?locale=${locale}`}>{AUTH_T[locale].registerBtn}</Link>
      </p>
    </AuthCard>
  );
}
