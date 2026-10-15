'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError, login, type Locale } from '@/lib/api';
import { AUTH_T } from '@/lib/i18n';
import { AuthCard, authStyles as s, EmailField, isEmail, PasswordField } from '@/components/auth-ui';
import { GoogleButton } from '@/components/google-button';
import { ResendVerification } from '@/components/resend-verification';

/** What the API sent us back to say, when it bounced the browser here itself. */
export type LoginNotice = 'unverified' | 'google';

export function LoginForm({
  locale,
  next,
  google,
  notice,
}: {
  locale: Locale;
  next?: string;
  google: boolean;
  notice?: LoginNotice;
}) {
  const t = AUTH_T[locale];
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(notice === 'google' ? t.errGoogle : null);
  // Shown under a wrong-password error, always — it must not hint at who has an account.
  const [showGoogleHint, setShowGoogleHint] = useState(false);
  // The address is confirmed but the mailbox was never opened: offer another link instead of an error.
  const [unverified, setUnverified] = useState(notice === 'unverified');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) return setError(t.errEmail);
    setBusy(true);
    setError(null);
    setShowGoogleHint(false);
    setUnverified(false);
    try {
      await login(email.trim(), password);
      // Only allow redirecting back to internal paths.
      const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : `/practice?locale=${locale}`;
      router.push(dest);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        if (/verify/i.test(err.message)) {
          setUnverified(true);
        } else {
          setError(t.errInvalid);
          setShowGoogleHint(google);
        }
      } else if (err instanceof ApiError && err.status === 429) {
        setError(t.errTooMany);
      } else {
        setError(t.errGeneric);
      }
      setBusy(false);
    }
  };

  return (
    <AuthCard title={t.loginTitle} sub={t.loginSub}>
      {google && <GoogleButton locale={locale} next={next} />}
      <form onSubmit={submit} noValidate>
        {error && (
          <p className={s.error} role="alert">
            {error}
            {showGoogleHint && (
              <>
                {' '}
                {t.googleHint}
              </>
            )}
          </p>
        )}
        {unverified && (
          <div className={s.notice} role="status">
            {t.errNotVerified}
            <div className={s.noticeRow}>
              {/* Needs the address: someone sent here by Google has not typed anything yet. */}
              <ResendVerification
                email={email}
                locale={locale}
                disabled={!isEmail(email)}
                buttonClass={s.linkBtn}
                statusClass={s.hint}
                errorClass={s.hint}
              />
            </div>
          </div>
        )}
        <EmailField label={t.email} value={email} onChange={setEmail} placeholder={t.emailPlaceholder} />
        <PasswordField
          label={t.password}
          value={password}
          onChange={setPassword}
          showText={t.showPassword}
          hideText={t.hidePassword}
          autoComplete="current-password"
          placeholder={t.passwordPlaceholder}
        />
        <button className={`btn btn-primary btn-lg ${s.submit}`} type="submit" disabled={busy}>
          {busy ? t.working : t.loginBtn}
        </button>
      </form>
      <p className={s.alt}>
        <Link href={`/forgot-password?locale=${locale}`}>{t.forgotLink}</Link>
      </p>
      <p className={s.alt}>
        {t.noAccount} <Link href={`/register?locale=${locale}`}>{t.registerBtn}</Link>
      </p>
    </AuthCard>
  );
}
