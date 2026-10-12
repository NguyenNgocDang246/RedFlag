'use client';

import { useState, type ReactNode } from 'react';
import { Check, CircleCheck, CircleX, LoaderCircle, MousePointerClick, ShieldAlert, ShieldCheck } from 'lucide-react';
import { answerQuiz, type Locale, type QuizQuestion, type QuizResult, type SignalInfo } from '@/lib/api';
import { TRAIN_T } from '@/lib/i18n';
import { fallbackScenario, shellKind } from './fallback-scenario';
import { ScenarioShell, signalsOf, spotKey } from './shells';
import s from './train.module.css';

/**
 * Interactive part of a quiz question (client).
 * Quizzes with `scenarioData` → simulated shell; the user taps hotspots to pick signals.
 * Legacy (text-only) quizzes → signal chip list. Both submit `selectedSignals`.
 */
export function QuizInteractive({
  q,
  locale,
  onResult,
  header,
}: {
  q: QuizQuestion;
  locale: Locale;
  /** Description (kind, topic, prompt...) — left column, above the answer area. */
  header?: ReactNode;
  /** Notifies the parent once graded (for progress / summary). */
  onResult?: (correct: boolean) => void;
}) {
  const t = TRAIN_T[locale];
  const [answeredScam, setAnsweredScam] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const hasShell = Boolean(q.scenarioData);
  const toggle = (code: string) =>
    setSelected((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]));

  const submit = async () => {
    setBusy(true);
    setError(false);
    try {
      const r = await answerQuiz(q.id, locale, answeredScam === true, answeredScam ? signalsOf(selected) : []);
      setResult(r);
      onResult?.(r.classifyCorrect);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const reveal = result
    ? {
        matched: result.matchedSignals.map((x) => x.code),
        missed: result.missedSignals.map((x) => x.code),
        wrong: result.wrongSignals.map((x) => x.code),
      }
    : undefined;

  return (
    <div className={s.split}>
      {header && <div className={s.info}>{header}</div>}

      {/* Right column: ALWAYS a simulated shell (minimal one built from text if data is missing). */}
      <div className={s.sim}>
        <ScenarioShell
          kind={shellKind(q.kind)}
          data={hasShell ? q.scenarioData : fallbackScenario(q.kind, q.scenario)}
          selected={selected}
          onToggle={toggle}
          locked={!hasShell || answeredScam !== true || result !== null}
          locale={locale}
          reveal={reveal}
        />
      </div>

      {/* Left column (below the description): answer + result. */}
      <div className={s.answer}>
      {!result && (
        <>
          <div className={s.question}>{t.question}</div>
          <div className={s.choices} role="radiogroup">
            <button
              type="button"
              role="radio"
              aria-checked={answeredScam === false}
              className={`${s.choice} ${answeredScam === false ? s.choiceSafe : ''}`}
              onClick={() => setAnsweredScam(false)}
            >
              <ShieldCheck size={22} aria-hidden />
              {t.safe}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={answeredScam === true}
              className={`${s.choice} ${answeredScam === true ? s.choiceScam : ''}`}
              onClick={() => setAnsweredScam(true)}
            >
              <ShieldAlert size={22} aria-hidden />
              {t.scam}
            </button>
          </div>

          {answeredScam === true && (
            <div className={s.signals}>
              {hasShell ? (
                <div className={s.tapHint}>
                  <MousePointerClick size={18} aria-hidden />
                  <span className={s.tapText}>
                    {t.tapPrompt}
                    <span className={s.tapCount}>{t.picked(selected.length)}</span>
                  </span>
                </div>
              ) : (
                <>
                  <div className={s.signalsLabel}>{t.which}</div>
                  <div className={s.signalChips}>
                    {q.signalOptions.map((o) => {
                      const on = selected.includes(o.code);
                      return (
                        <button
                          key={o.code}
                          type="button"
                          aria-pressed={on}
                          className={`${s.signalChip} ${on ? s.signalOn : ''}`}
                          onClick={() => toggle(o.code)}
                        >
                          <span className={s.box}>{on && <Check size={14} strokeWidth={3} aria-hidden />}</span>
                          {o.name}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {error && <p className={s.error}>{t.error}</p>}

          {answeredScam !== null && (
            <button type="button" className={`btn btn-primary ${s.check}`} onClick={submit} disabled={busy}>
              {busy && <LoaderCircle size={18} className={s.spin} aria-hidden />}
              {busy ? t.checking : t.check}
            </button>
          )}
        </>
      )}

      {result && <ResultPanel result={result} selected={selected} locale={locale} />}
      </div>
    </div>
  );
}

function ResultPanel({ result, selected, locale }: { result: QuizResult; selected: string[]; locale: Locale }) {
  const t = TRAIN_T[locale];
  const ok = result.classifyCorrect;
  // Wrong picks: each picked decoy explains itself (per-quiz note on why it's normal); a wrong signal
  // with no picked decoy behind it (chip mode) falls back to the generic signal explanation.
  const pickedDecoys = (result.decoySpots ?? []).filter((d) => d.note && selected.includes(spotKey(d.signal, d.text)));
  const wrongItems: Item[] = [
    ...pickedDecoys.map((d) => ({ key: spotKey(d.signal, d.text), name: `“${d.text}”`, explanation: d.note })),
    // Plain text (no signal) that was picked: nothing quiz-specific to say, so point to what to inspect instead.
    ...selected
      .filter((k) => k.startsWith('|'))
      .map((k) => ({ key: k, name: `“${k.slice(1)}”`, explanation: t.plainPick })),
    ...result.wrongSignals
      .filter((x) => !pickedDecoys.some((d) => d.signal === x.code))
      .map((x) => ({ key: x.code, name: x.name, explanation: x.explanation })),
  ];
  // Spotted / missed: one entry per correct hotspot of the signal, with this quiz's own "why it is a red flag" note;
  // a signal with no note falls back to the generic signal explanation.
  const asItems = (xs: SignalInfo[]): Item[] =>
    xs.flatMap((x) => {
      const spots = (result.correctSpots ?? []).filter((c) => c.signal === x.code && c.note);
      return spots.length
        ? spots.map((c) => ({ key: spotKey(c.signal, c.text), name: x.name, quote: c.text, explanation: c.note }))
        : [{ key: x.code, name: x.name, explanation: x.explanation }];
    });
  return (
    <div className={`${s.result} ${ok ? s.resultOk : s.resultBad}`} role="status">
      <div className={s.resultHead}>
        {ok ? <CircleCheck size={26} aria-hidden /> : <CircleX size={26} aria-hidden />}
        <div>
          <div className={s.resultTitle}>{ok ? t.correct : t.wrong}</div>
          <div className={s.resultSub}>{result.correctAnswerIsScam ? t.wasScam : t.wasSafe}</div>
        </div>
      </div>
      {result.explanation && <p className={s.explain}>{result.explanation}</p>}
      <SignalGroup label={t.youSpotted} items={asItems(result.matchedSignals)} tone="ok" />
      <SignalGroup label={t.youMissed} items={asItems(result.missedSignals)} tone="warn" />
      <SignalGroup label={t.youGotWrong} items={wrongItems} tone="bad" />
    </div>
  );
}

type Item = { key: string; name: string; explanation: string; quote?: string };

function SignalGroup({ label, items, tone }: { label: string; items: Item[]; tone: 'ok' | 'warn' | 'bad' }) {
  if (items.length === 0) return null;
  const cls = tone === 'ok' ? s.tagOk : tone === 'warn' ? s.tagWarn : s.tagBad;
  return (
    <div className={s.group}>
      <div className={s.groupLabel}>{label}</div>
      <ul className={s.tags}>
        {items.map((x) => (
          <li key={x.key} className={`${s.tag} ${cls}`} title={x.explanation}>
            <b>{x.name}</b>
            {x.quote && <q className={s.tagQuote}>{x.quote.length > 90 ? `${x.quote.slice(0, 90)}…` : x.quote}</q>}
            {x.explanation && <span>{x.explanation}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
