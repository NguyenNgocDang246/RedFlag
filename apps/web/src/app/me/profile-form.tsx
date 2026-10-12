'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Check, LoaderCircle, UserPen } from 'lucide-react';
import { SelectInput } from '@/components/select-input';
import { updateProfile, type Locale, type Me } from '@/lib/api';
import { ME_T } from '@/lib/i18n';
import s from './me.module.css';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Tiếng Việt' },
];

/** Personal info — every field optional (R9). Saving a different language switches the page to it. */
export function ProfileForm({ me, locale }: { me: Me; locale: Locale }) {
  const t = ME_T[locale];
  const router = useRouter();
  const [name, setName] = useState(me.name ?? '');
  const [occupation, setOccupation] = useState(me.occupation ?? '');
  const [services, setServices] = useState(me.servicesUsed.join(', '));
  const [language, setLanguage] = useState<Locale>(me.locale);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('saving');
    try {
      await updateProfile({
        name,
        occupation,
        servicesUsed: services
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
        locale: language,
      });
      setStatus('saved');
      if (language !== locale) router.replace(`/me/profile?locale=${language}`);
      else router.refresh();
    } catch {
      setStatus('error');
    }
  };

  const edit =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      if (status !== 'saving') setStatus('idle');
    };

  return (
    <section className={s.card}>
      <h1 className={s.cardTitle}>
        <UserPen size={20} aria-hidden /> {t.profileTitle}
      </h1>
      <p className={s.muted}>{t.profileSub}</p>

      <form className={s.form} onSubmit={onSubmit}>
        <label className={s.field}>
          <span className={s.label}>{t.name}</span>
          <input
            className={s.input}
            value={name}
            maxLength={80}
            autoComplete="nickname"
            onChange={(e) => edit(setName)(e.target.value)}
          />
        </label>
        <label className={s.field}>
          <span className={s.label}>{t.occupation}</span>
          <input
            className={s.input}
            value={occupation}
            maxLength={80}
            onChange={(e) => edit(setOccupation)(e.target.value)}
          />
          <span className={s.hint}>{t.occupationHint}</span>
        </label>
        <label className={`${s.field} ${s.fieldWide}`}>
          <span className={s.label}>{t.services}</span>
          <input
            className={s.input}
            value={services}
            onChange={(e) => edit(setServices)(e.target.value)}
          />
          <span className={s.hint}>{t.servicesHint}</span>
        </label>
        <div className={s.field}>
          <SelectInput
            label={<span className={s.label}>{t.language}</span>}
            value={language}
            onChange={(v) => edit(setLanguage)(v as Locale)}
            options={LANGUAGES}
          />
        </div>

        <div className={`${s.actions} ${s.fieldWide}`}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={status === 'saving'}
          >
            {status === 'saving' && (
              <LoaderCircle size={18} className={s.spin} aria-hidden />
            )}
            {status === 'saving' ? t.saving : t.save}
          </button>
          {status === 'saved' && (
            <span className={s.ok} role="status">
              <Check size={18} aria-hidden />
              {t.saved}
            </span>
          )}
          {status === 'error' && (
            <span className={s.err} role="alert">
              {t.error}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
