'use client';

import { useEffect, useState } from 'react';
import { ApiError, resendVerification, type Locale } from '@/lib/api';
import { AUTH_T } from '@/lib/i18n';

/** Long enough that the button reads as one-shot, short enough not to feel stuck. */
const COOLDOWN_SEC = 60;

/**
 * "Send the confirmation email again" — the way out for anyone whose link expired.
 * Callers pass their own classes, since this sits both on the auth cards and inside /me.
 */
export function ResendVerification({
  email,
  locale,
  disabled,
  buttonClass,
  statusClass,
  errorClass,
}: {
  email: string;
  locale: Locale;
  disabled?: boolean;
  buttonClass: string;
  statusClass: string;
  errorClass: string;
}) {
  const t = AUTH_T[locale];
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'tooMany' | 'error'>('idle');
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const send = async () => {
    setState('sending');
    try {
      await resendVerification(email.trim(), locale);
      setState('sent');
      setSecondsLeft(COOLDOWN_SEC);
    } catch (err) {
      setState(err instanceof ApiError && err.status === 429 ? 'tooMany' : 'error');
    }
  };

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        disabled={disabled || state === 'sending' || secondsLeft > 0}
        onClick={send}
      >
        {state === 'sending' ? t.working : t.resendBtn}
      </button>
      {state === 'sent' && (
        <span className={statusClass} role="status">
          {t.resendSent}
        </span>
      )}
      {(state === 'tooMany' || state === 'error') && (
        <span className={errorClass} role="alert">
          {state === 'tooMany' ? t.errTooMany : t.errGeneric}
        </span>
      )}
    </>
  );
}
