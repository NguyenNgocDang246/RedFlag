'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  KeyRound,
  LoaderCircle,
  LogOut,
  Monitor,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { PasswordField } from '@/components/auth-ui';
import {
  ApiError,
  changePassword,
  fetchSessions,
  revokeOtherSessions,
  revokeSession,
  type DeviceSession,
  type Locale,
} from '@/lib/api';
import { AUTH_T, ME_T } from '@/lib/i18n';
import s from './me.module.css';

/** "Chrome on Windows" from a user-agent string — enough for people to recognise their own devices. */
function deviceName(ua: string | null): { label: string | null; mobile: boolean } {
  if (!ua) return { label: null, mobile: false };
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : null;
  const os = /iPhone|iPad/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : null;
  const mobile = /Mobi|iPhone|Android/.test(ua);
  if (!browser && !os) return { label: null, mobile };
  return { label: [browser, os].filter(Boolean).join(' · '), mobile };
}

function ago(iso: string, locale: Locale): string {
  const sec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, size] of steps)
    if (Math.abs(sec) >= size) return rtf.format(Math.round(sec / size), unit);
  return rtf.format(0, 'minute');
}

/** Email, password change and signed-in devices. */
export function AccountSection({ email, locale }: { email: string; locale: Locale }) {
  const t = ME_T[locale];
  const ta = AUTH_T[locale];
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [pwStatus, setPwStatus] = useState<
    'idle' | 'saving' | 'done' | 'wrong' | 'short' | 'error'
  >('idle');
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      setSessions(await fetchSessions());
    } catch {
      setSessions([]);
    }
  }, []);
  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const onPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return setPwStatus('short');
    setPwStatus('saving');
    try {
      await changePassword(current, next);
      setPwStatus('done');
      setCurrent('');
      setNext('');
      void loadSessions();
    } catch (err) {
      setPwStatus(err instanceof ApiError && err.status === 400 ? 'wrong' : 'error');
    }
  };

  const signOut = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      await loadSessions();
      setBusy(false);
    }
  };

  const others = sessions?.filter((x) => !x.current).length ?? 0;

  return (
    <section className={s.card}>
      <h1 className={s.cardTitle}>
        <ShieldCheck size={20} aria-hidden /> {t.accountTitle}
      </h1>
      <dl className={s.kv}>
        <dt>{t.email}</dt>
        <dd>{email}</dd>
      </dl>

      <h2 className={s.subTitle}>
        <KeyRound size={18} aria-hidden /> {t.changePassword}
      </h2>
      <form className={s.passwordForm} onSubmit={onPassword}>
        <PasswordField
          label={t.currentPassword}
          value={current}
          onChange={setCurrent}
          showText={ta.showPassword}
          hideText={ta.hidePassword}
          autoComplete="current-password"
        />
        <PasswordField
          label={t.newPassword}
          hint={ta.passwordHint}
          value={next}
          onChange={setNext}
          showText={ta.showPassword}
          hideText={ta.hidePassword}
          autoComplete="new-password"
        />
        <div className={s.actions}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={pwStatus === 'saving'}
          >
            {pwStatus === 'saving' && (
              <LoaderCircle size={18} className={s.spin} aria-hidden />
            )}
            {t.changePassword}
          </button>
          {pwStatus === 'done' && (
            <span className={s.ok} role="status">
              <Check size={18} aria-hidden />
              {t.passwordChanged}
            </span>
          )}
          {(pwStatus === 'wrong' || pwStatus === 'short' || pwStatus === 'error') && (
            <span className={s.err} role="alert">
              {pwStatus === 'wrong'
                ? t.errWrongPassword
                : pwStatus === 'short'
                  ? ta.errShortPassword
                  : t.error}
            </span>
          )}
        </div>
      </form>

      <h2 className={s.subTitle}>
        <Monitor size={18} aria-hidden /> {t.devices}
      </h2>
      {sessions === null ? (
        <LoaderCircle size={20} className={s.spin} aria-hidden />
      ) : (
        <>
          <ul className={s.rows}>
            {sessions.map((x) => {
              const d = deviceName(x.userAgent);
              const Icon = d.mobile ? Smartphone : Monitor;
              return (
                <li key={x.id} className={s.row}>
                  <Icon size={20} className={s.rowIcon} aria-hidden />
                  <span className={s.rowMain}>
                    <span className={s.rowStrong}>{d.label ?? t.unknownDevice}</span>
                    <span className={s.rowSub}>
                      {x.current ? t.thisDevice : t.lastActive(ago(x.lastUsedAt, locale))}
                    </span>
                  </span>
                  {!x.current && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() => signOut(() => revokeSession(x.id))}
                    >
                      {t.signOut}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {others > 0 && (
            <div className={s.actions}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => signOut(revokeOtherSessions)}
              >
                <LogOut size={18} aria-hidden />
                {t.signOutOthers}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
