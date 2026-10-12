'use client';

import { useEffect, useState } from 'react';
import {
  CirclePause,
  CirclePlay,
  LoaderCircle,
  MailWarning,
  Power,
  TriangleAlert,
} from 'lucide-react';
import {
  enableTest,
  fetchTestStatus,
  fetchTestWarning,
  pauseTest,
  resumeTest,
  setTestFrequency,
  unsubscribeTest,
  type Locale,
  type TestFrequencyLevel,
  type TestStatus,
  type TestWarning,
} from '@/lib/api';
import { ME_T } from '@/lib/i18n';
import s from './me.module.css';

const LEVELS: TestFrequencyLevel[] = ['low', 'medium', 'high'];

/** Same forgiving match as the API (trim, case, spaces, trailing dot) — R9. */
const normalize = (v: string) =>
  v
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!…]+$/u, '');

/**
 * Surprise email tests (R1): turning on needs the warning read and the confirmation sentence retyped
 * (type-to-confirm, not a checkbox). Once on: change frequency, pause / resume, or turn off for good.
 */
export function TestSettings({
  initial,
  locale,
}: {
  initial: TestStatus;
  locale: Locale;
}) {
  const t = ME_T[locale];
  const [status, setStatus] = useState(initial);
  const [frequency, setFrequency] = useState<TestFrequencyLevel>(
    initial.frequency ?? 'medium',
  );
  const [warning, setWarning] = useState<TestWarning | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The warning + sentence are only needed while off, in the page's language.
  useEffect(() => {
    if (status.state !== 'off') return;
    fetchTestWarning(locale)
      .then(setWarning)
      .catch(() => setWarning(null));
  }, [status.state, locale]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      const next = await fetchTestStatus();
      setStatus(next);
      if (next.frequency) setFrequency(next.frequency);
      setTyped('');
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  };

  const matches =
    warning !== null && normalize(typed) === normalize(warning.confirmPhrase);
  const stateLabel = { on: t.stateOn, paused: t.statePaused, off: t.stateOff }[
    status.state
  ];

  const frequencyPicker = (onPick: (f: TestFrequencyLevel) => void) => (
    <fieldset className={s.choices} disabled={busy}>
      <legend className={s.label}>{t.frequency}</legend>
      {LEVELS.map((f) => (
        <label key={f} className={`${s.choice} ${frequency === f ? s.choiceOn : ''}`}>
          <input
            type="radio"
            name="frequency"
            value={f}
            checked={frequency === f}
            onChange={() => onPick(f)}
          />
          {t.freq[f]}
        </label>
      ))}
    </fieldset>
  );

  return (
    <section className={s.card}>
      <div className={s.cardHead}>
        <h1 className={s.cardTitle}>
          <MailWarning size={20} aria-hidden /> {t.testTitle}
        </h1>
        <span className={`${s.badge} ${s[`badge_${status.state}`]}`}>
          {status.state === 'on' ? (
            <CirclePlay size={15} aria-hidden />
          ) : status.state === 'paused' ? (
            <CirclePause size={15} aria-hidden />
          ) : (
            <Power size={15} aria-hidden />
          )}
          {stateLabel}
        </span>
      </div>
      <p className={s.muted}>{t.testSub}</p>

      {status.state === 'off' ? (
        <div className={s.stack}>
          {frequencyPicker(setFrequency)}

          {warning && (
            <div className={s.warning}>
              <strong>
                <TriangleAlert size={18} aria-hidden /> {t.howToReport}
              </strong>
              <p>{warning.warning}</p>
            </div>
          )}

          {warning && (
            <label className={s.field}>
              <span className={s.label}>{t.confirmLabel(warning.confirmPhrase)}</span>
              <input
                className={s.input}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={typed !== '' && !matches}
              />
              {typed !== '' && !matches && (
                <span className={s.hint}>{t.confirmMismatch}</span>
              )}
            </label>
          )}

          <div className={s.actions}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!matches || busy}
              onClick={() => run(() => enableTest(frequency, typed, locale))}
            >
              {busy && <LoaderCircle size={18} className={s.spin} aria-hidden />}
              {t.turnOn}
            </button>
          </div>
        </div>
      ) : (
        <div className={s.stack}>
          {status.state === 'on' &&
            frequencyPicker((f) => {
              setFrequency(f);
              void run(() => setTestFrequency(f));
            })}
          {status.state === 'paused' && <p className={s.note}>{t.pausedNote}</p>}

          <div className={s.actions}>
            {status.state === 'on' ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => run(pauseTest)}
              >
                <CirclePause size={18} aria-hidden />
                {t.pause}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => run(resumeTest)}
              >
                <CirclePlay size={18} aria-hidden />
                {t.resume}
              </button>
            )}
            <button
              type="button"
              className={`btn btn-ghost ${s.danger}`}
              disabled={busy}
              onClick={() => {
                if (window.confirm(t.unsubscribeConfirm)) void run(unsubscribeTest);
              }}
            >
              <Power size={18} aria-hidden />
              {t.unsubscribe}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className={s.err} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
