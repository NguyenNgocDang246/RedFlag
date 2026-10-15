'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { ApiError, requestPasswordReset, type Locale } from '@/lib/api';
import { AUTH_T } from '@/lib/i18n';
import { AuthCard, authStyles as s, EmailField, isEmail } from '@/components/auth-ui';

/** Asks for a reset link. The answer is the same for every address, so nothing leaks either way. */
export function ForgotForm({ locale }: { locale: Locale }) {
  const t = AUTH_T[locale];
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) return setError(t.errEmail);
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim(), locale);
      setSentTo(email.trim());
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? t.errTooMany : t.errGeneric);
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <AuthCard
        icon={<MailCheck size={26} />}
        title={t.forgotSentTitle}
        sub={t.forgotSentBody(sentTo)}
      >
        <p className={s.hint}>{t.checkHint}</p>
        <p className={s.alt}>
          <Link href={`/login?locale=${locale}`}>{t.goLogin}</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t.forgotTitle} sub={t.forgotSub}>
      <form onSubmit={submit} noValidate>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <EmailField label={t.email} value={email} onChange={setEmail} placeholder={t.emailPlaceholder} />
        <button className={`btn btn-primary btn-lg ${s.submit}`} type="submit" disabled={busy}>
          {busy ? t.working : t.forgotBtn}
        </button>
      </form>
      <p className={s.alt}>
        {t.haveAccount} <Link href={`/login?locale=${locale}`}>{t.loginBtn}</Link>
      </p>
    </AuthCard>
  );
}
