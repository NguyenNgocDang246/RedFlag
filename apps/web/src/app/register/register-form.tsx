'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { MailCheck, UserPlus } from 'lucide-react';
import { ApiError, register, type Locale } from '@/lib/api';
import { AUTH_T } from '@/lib/i18n';
import { AuthCard, authStyles as s, EmailField, isEmail, PasswordField } from '@/components/auth-ui';
import { GoogleButton } from '@/components/google-button';
import { ResendVerification } from '@/components/resend-verification';

export function RegisterForm({ locale, google }: { locale: Locale; google: boolean }) {
  const t = AUTH_T[locale];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) return setError(t.errEmail);
    if (password.length < 8) return setError(t.errShortPassword);
    setBusy(true);
    setError(null);
    try {
      await register(email.trim(), password, locale);
      setSentTo(email.trim());
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setError(t.errExists);
      else if (err instanceof ApiError && err.status === 429) setError(t.errTooMany);
      else setError(t.errGeneric);
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <AuthCard icon={<MailCheck size={26} />} title={t.checkTitle} sub={t.checkBody(sentTo)}>
        <p className={s.hint}>{t.checkHint}</p>
        <div className={s.noticeRow}>
          <ResendVerification
            email={sentTo}
            locale={locale}
            buttonClass={s.linkBtn}
            statusClass={s.hint}
            errorClass={s.hint}
          />
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard icon={<UserPlus size={26} />} title={t.registerTitle} sub={t.registerSub}>
      {google && <GoogleButton locale={locale} />}
      <form onSubmit={submit} noValidate>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <EmailField label={t.email} value={email} onChange={setEmail} />
        <PasswordField
          label={t.password}
          hint={t.passwordHint}
          value={password}
          onChange={setPassword}
          showText={t.showPassword}
          hideText={t.hidePassword}
          autoComplete="new-password"
        />
        <button className={`btn btn-primary btn-lg ${s.submit}`} type="submit" disabled={busy}>
          {busy ? t.working : t.registerBtn}
        </button>
      </form>
      <p className={s.alt}>
        {t.haveAccount} <Link href={`/login?locale=${locale}`}>{t.loginBtn}</Link>
      </p>
    </AuthCard>
  );
}
