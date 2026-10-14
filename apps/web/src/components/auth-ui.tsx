'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import s from './auth.module.css';

/** Shared frame for the sign-in / sign-up / confirmation pages. */
export function AuthCard({
  icon,
  title,
  sub,
  children,
}: {
  /** Omit for the form pages: the heading and sub then sit centered. */
  icon?: ReactNode;
  title: string;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  const centered = icon ? '' : ` ${s.centered}`;
  return (
    <main className={s.wrap}>
      <div className={s.bg} aria-hidden />
      <div className={s.card}>
        <div className={s.headRow + centered}>
          {icon && (
            <span className={s.icon} aria-hidden>
              {icon}
            </span>
          )}
          <h1 className={s.title}>{title}</h1>
        </div>
        {sub && <p className={s.sub + centered}>{sub}</p>}
        {children}
      </div>
    </main>
  );
}

export function EmailField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      <input
        className={s.input}
        type="email"
        placeholder={placeholder}
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
  placeholder,
}: {
  label: string;
  hint?: string;
  placeholder?: string;
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
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ paddingRight: 52 }}
        />
        <button
          type="button"
          className={s.toggle}
          onClick={() => setShow((v) => !v)}
          aria-label={show ? hideText : showText}
          title={show ? hideText : showText}
          aria-pressed={show}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {hint && <div className={s.hint}>{hint}</div>}
    </label>
  );
}

export const authStyles = s;

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
