'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Play } from 'lucide-react';
import { startContest, type Locale } from '@/lib/api';
import { CONTEST_T } from '@/lib/i18n';
import ts from '../train/train.module.css';
import s from './contest.module.css';

export function StartButton({ locale }: { locale: Locale }) {
  const t = CONTEST_T[locale];
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const start = async () => {
    setBusy(true);
    setError(false);
    try {
      const { id } = await startContest(locale);
      router.push(`/contest/${id}?locale=${locale}`);
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={start} disabled={busy}>
        {busy ? (
          <LoaderCircle size={18} className={ts.spin} aria-hidden />
        ) : (
          <Play size={18} aria-hidden />
        )}
        {busy ? t.starting : t.start}
      </button>
      {error && <p className={s.error}>{t.loadError}</p>}
    </>
  );
}
