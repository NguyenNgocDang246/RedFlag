'use client';

import { useState, type ReactNode } from 'react';
import s from './auth.module.css';

/** Shared frame for the sign-in / sign-up / confirmation pages. */
export function AuthCard({
  icon,
  title,
  sub,
  children,
}: {
  icon: ReactNode;
  title: string;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <main className={s.wrap}>
      <div className={s.bg} aria-hidden />
      <div className={s.card}>
        <div className={s.headRow}>
          <span className={s.icon} aria-hidden>
            {icon}
          </span>
          <h1 className={s.title}>{title}</h1>
        </div>
        {sub && <p className={s.sub}>{sub}</p>}
        {children}
      </div>
    </main>
  );
}

export function EmailField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      <input
        className={s.input}
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function PasswordField({
  label,
  hint,
  value,
  onChange,
  showText,
  hideText,
  autoComplete,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  showText: string;
  hideText: string;
  autoComplete: 'current-password' | 'new-password';
}) {
  const [show, setShow] = useState(false);
  return (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      <span className={s.inputRow}>
        <input
          className={s.input}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingRight: 72 }}
        />
        <button type="button" className={s.toggle} onClick={() => setShow((v) => !v)}>
          {show ? hideText : showText}
        </button>
      </span>
      {hint && <div className={s.hint}>{hint}</div>}
    </label>
  );
}

export const authStyles = s;

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
