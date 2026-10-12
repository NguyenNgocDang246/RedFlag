import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import s from './select-input.module.css';

export interface SelectOption {
  value: string | number;
  label: ReactNode;
  disabled?: boolean;
}

/**
 * The one select used across the app: native `<select>` (keyboard, screen readers and mobile pickers
 * for free) with a shared look and a drawn chevron.
 *
 * - `variant`: `field` = form control (square-ish, fills its column); `pill` = filter chip (rounded).
 * - `placeholder`: adds an empty-value first option (e.g. "All channels" / "— None —").
 * - `label`: wraps it in a `<label>`; `hideLabel` keeps that label for screen readers only.
 *   Omit both when the select already sits inside a labelled field.
 * - `fit`: width follows the chosen option instead of filling the container.
 * - `active`: highlights a filter that is set; `tone` colours the control (e.g. correct / decoy hotspot).
 * - `onChange` receives the raw string value.
 */
export function SelectInput({
  value,
  onChange,
  options,
  children,
  placeholder,
  label,
  hideLabel,
  variant = 'field',
  size = 'md',
  fit,
  active,
  tone,
  disabled,
  required,
  name,
  id,
  title,
  className,
  'aria-label': ariaLabel,
}: {
  value: string | number | undefined | null;
  onChange: (value: string) => void;
  options?: SelectOption[];
  children?: ReactNode;
  placeholder?: ReactNode;
  label?: ReactNode;
  hideLabel?: boolean;
  variant?: 'field' | 'pill';
  size?: 'sm' | 'md';
  fit?: boolean;
  active?: boolean;
  tone?: 'success' | 'warn';
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  title?: string;
  className?: string;
  'aria-label'?: string;
}) {
  const cls = [
    s.wrap,
    s[variant],
    s[size],
    fit ? s.fit : '',
    active ? s.active : '',
    tone ? s[tone] : '',
    disabled ? s.disabled : '',
    label === undefined ? (className ?? '') : '',
  ]
    .filter(Boolean)
    .join(' ');

  const control = (
    <span className={cls}>
      <select
        className={s.select}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        name={name}
        id={id}
        title={title}
        aria-label={ariaLabel}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options?.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown className={s.chevron} size={size === 'sm' ? 14 : 16} aria-hidden />
    </span>
  );

  if (label === undefined) return control;
  return (
    <label className={`${s.labelled} ${fit ? '' : s.labelledBlock} ${className ?? ''}`}>
      <span className={hideLabel ? s.srOnly : s.labelText}>{label}</span>
      {control}
    </label>
  );
}
