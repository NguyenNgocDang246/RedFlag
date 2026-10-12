'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CircleCheck, MousePointerClick } from 'lucide-react';
import { QuizKind, SignalCode, type SmsScenario } from '@redflag/shared';
import type { Locale } from '@/lib/api';
import { HOME_T } from '@/lib/i18n';
import { ScenarioShell, signalsOf } from './train/shells';
import s from './home.module.css';

/** Home page demo scenario — graded on the client since the answer is fixed. */
const DEMO: Record<Locale, SmsScenario> = {
  en: {
    sender: { text: 'FastShip', signal: SignalCode.SENDER_MISMATCH },
    messages: [
      { text: 'FastShip: Your parcel is on hold because the address is incomplete.', signal: SignalCode.MISSING_DETAILS },
      { text: 'Update within 2 hours or it will be returned.', signal: SignalCode.URGENCY },
      { text: 'fastship-delivery.top/update', signal: SignalCode.LOOKALIKE_DOMAIN },
    ],
  },
  vi: {
    sender: { text: 'FastShip', signal: SignalCode.SENDER_MISMATCH },
    messages: [
      { text: 'FastShip: Đơn hàng của bạn đang bị giữ do địa chỉ chưa đầy đủ.', signal: SignalCode.MISSING_DETAILS },
      { text: 'Cập nhật trong 2 giờ, nếu không đơn sẽ bị hoàn.', signal: SignalCode.URGENCY },
      { text: 'fastship-delivery.top/capnhat', signal: SignalCode.LOOKALIKE_DOMAIN },
    ],
  },
};
// 2 correct hotspots + 2 decoys (sender name, opening line) — tapping any gives the same feedback.
const ANSWER: string[] = [SignalCode.URGENCY, SignalCode.LOOKALIKE_DOMAIN];

export function HeroDemo({ locale }: { locale: Locale }) {
  const t = HOME_T[locale];
  const [selected, setSelected] = useState<string[]>([]);
  const picked = signalsOf(selected);
  const found = picked.filter((c) => ANSWER.includes(c)).length;
  const done = found === ANSWER.length;
  const toggle = (key: string) =>
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  return (
    <div className={s.demo}>
      <div className={s.demoTitle}>
        <MousePointerClick size={18} aria-hidden />
        {t.demoTitle}
      </div>
      <ScenarioShell
        kind={QuizKind.SMS_INSPECTION}
        data={DEMO[locale]}
        selected={selected}
        onToggle={toggle}
        locked={done}
        locale={locale}
        reveal={done ? { matched: ANSWER, missed: [], wrong: picked.filter((c) => !ANSWER.includes(c)) } : undefined}
      />
      <div className={s.demoStatus} aria-live="polite">
        {done ? (
          <>
            <span className={s.demoDone}>
              <CircleCheck size={20} aria-hidden style={{ flex: '0 0 auto' }} />
              {t.demoDone}
            </span>
            <Link href={`/train?locale=${locale}`} className={s.demoMore}>
              {t.demoMore}
              <ArrowRight size={16} aria-hidden />
            </Link>
          </>
        ) : (
          <>
            <span>{t.demoFound(found, ANSWER.length)}</span>
            <span className={s.progress} aria-hidden>
              <span className={s.progressBar} style={{ width: `${(found / ANSWER.length) * 100}%`, display: 'block' }} />
            </span>
          </>
        )}
      </div>
    </div>
  );
}
