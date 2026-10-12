'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, CircleCheck, LoaderCircle, MousePointerClick, ShieldAlert } from 'lucide-react';
import {
  fetchMyTestEmails,
  reportTestEmail,
  reportTestEmailSignal,
  type Locale,
  type ReportableCampaign,
  type SignalOption,
} from '@/lib/api';
import { REPORT_T } from '@/lib/i18n';
import s from './report.module.css';

/** Which email is in the "which sign gave it away?" step, and the choices for it. */
interface Asking {
  campaignId: string;
  signals: SignalOption[];
}

/**
 * The user's own practice emails with a report button on each. Reporting is one tap; the follow-up
 * question is a choice from the signs that email actually carried, never a free-text box (R2), and
 * it can be skipped.
 */
export function ReportList({ locale }: { locale: Locale }) {
  const t = REPORT_T[locale];
  const [items, setItems] = useState<ReportableCampaign[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [asking, setAsking] = useState<Asking | null>(null);
  const [thanksId, setThanksId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchMyTestEmails(locale)
      .then((rows) => alive && setItems(rows))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [locale]);

  const onReport = async (id: string) => {
    setBusyId(id);
    setError(false);
    try {
      const { signals } = await reportTestEmail(id, locale);
      setItems((cur) => cur?.map((x) => (x.id === id ? { ...x, reported: true } : x)) ?? cur);
      setThanksId(id);
      if (signals.length > 0) setAsking({ campaignId: id, signals });
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  /**
   * For an email already reported — usually by forwarding it, which can't ask the question. Reporting
   * again is a no-op on the server and hands back the signs to choose from.
   */
  const onAskLater = async (id: string) => {
    setBusyId(id);
    setError(false);
    try {
      const { signals } = await reportTestEmail(id, locale);
      if (signals.length > 0) setAsking({ campaignId: id, signals });
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  };

  const onPickSignal = async (code: string) => {
    if (!asking) return;
    const { campaignId } = asking;
    setAsking(null);
    try {
      await reportTestEmailSignal(campaignId, code);
      setItems((cur) => cur?.map((x) => (x.id === campaignId ? { ...x, signalPicked: true } : x)) ?? cur);
    } catch {
      setError(true);
    }
  };

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
      dateStyle: 'medium',
    });

  if (items === null) {
    return (
      <section className={s.card}>
        <LoaderCircle size={22} className={s.spin} aria-hidden />
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className={s.card}>
        <h2 className={s.cardTitle}>{t.listTitle}</h2>
        <p className={s.muted}>{t.empty}</p>
        <p className={s.muted}>{t.emptyHint}</p>
      </section>
    );
  }

  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}>{t.listTitle}</h2>
      <ul className={s.list}>
        {items.map((x) => (
          <li key={x.id} className={s.item}>
            <div className={s.itemMain}>
              <span className={s.subject}>{x.subject}</span>
              <span className={s.meta}>
                {t.from} {x.senderName} · {date(x.sentAt)}
              </span>
              {x.clicked && (
                <span className={s.clicked}>
                  <MousePointerClick size={14} aria-hidden />
                  {t.clickedBadge}
                </span>
              )}
            </div>

            {x.reported ? (
              <div className={s.reportedCol}>
                <span className={s.done}>
                  <CircleCheck size={18} aria-hidden />
                  {t.reportedBadge}
                </span>
                {!x.signalPicked && thanksId !== x.id && asking?.campaignId !== x.id && (
                  <button
                    type="button"
                    className={s.pickLink}
                    disabled={busyId === x.id}
                    onClick={() => void onAskLater(x.id)}
                  >
                    {t.pickSignalBtn}
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busyId === x.id}
                onClick={() => onReport(x.id)}
              >
                {busyId === x.id ? (
                  <LoaderCircle size={16} className={s.spin} aria-hidden />
                ) : (
                  <ShieldAlert size={16} aria-hidden />
                )}
                {busyId === x.id ? t.reporting : t.reportBtn}
              </button>
            )}

            {(thanksId === x.id || asking?.campaignId === x.id) && (
              <div className={s.follow} role="status">
                {thanksId === x.id && (
                  <p className={s.thanks}>
                    <CircleCheck size={18} aria-hidden />
                    <span>
                      <b>{t.thanksTitle}</b> {t.thanksBody}
                    </span>
                  </p>
                )}

                {asking?.campaignId === x.id && (
                  <>
                    <p className={s.askTitle}>{t.askTitle}</p>
                    <p className={s.muted}>{t.askHint}</p>
                    <div className={s.chips}>
                      {asking.signals.map((sig) => (
                        <button
                          key={sig.code}
                          type="button"
                          className={s.chip}
                          onClick={() => void onPickSignal(sig.code)}
                        >
                          <Check size={14} aria-hidden />
                          {sig.name}
                        </button>
                      ))}
                      <button type="button" className={s.skip} onClick={() => setAsking(null)}>
                        {t.askSkip}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {error && (
        <p className={s.error} role="alert">
          {t.error}{' '}
          <Link href={`/me/test?locale=${locale}`}>{t.settingsCta}</Link>
        </p>
      )}
    </section>
  );
}
