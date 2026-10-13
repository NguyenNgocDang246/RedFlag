'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import s from './select-input.module.css';

export interface SelectOption {
  value: string | number;
  label: ReactNode;
  disabled?: boolean;
}

/** Gap kept between the list and the trigger / the viewport edges. */
const GAP = 6;
const EDGE = 8;
const MAX_LIST_HEIGHT = 320;

/** Plain text of a label, for type-ahead. */
function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return '';
}

/**
 * The one select used across the app: a button that opens a drawn listbox (themed, with a check on
 * the chosen option) instead of the OS dropdown. Keyboard follows the native select: arrows / Home /
 * End move, Enter / Space pick, Esc closes, typing jumps to a matching option.
 *
 * - `variant`: `field` = form control (square-ish, fills its column); `pill` = filter chip (rounded).
 * - `placeholder`: adds an empty-value first option (e.g. "All channels" / "None").
 * - `label`: wraps it in a `<label>`; `hideLabel` keeps that label for screen readers only.
 *   Omit both when the select already sits inside a labelled field.
 * - `fit`: width follows the chosen option instead of filling the container.
 * - `active`: highlights a filter that is set; `tone` colours the control (e.g. correct / decoy hotspot).
 * - `onChange` receives the raw string value.
 */
export function SelectInput({
  value,
  onChange,
  options = [],
  placeholder,
  label,
  hideLabel,
  variant = 'field',
  size = 'md',
  fit,
  active,
  tone,
  disabled,
  id,
  title,
  className,
  'aria-label': ariaLabel,
}: {
  value: string | number | undefined | null;
  onChange: (value: string) => void;
  options?: SelectOption[];
  placeholder?: ReactNode;
  label?: ReactNode;
  hideLabel?: boolean;
  variant?: 'field' | 'pill';
  size?: 'sm' | 'md';
  fit?: boolean;
  active?: boolean;
  tone?: 'success' | 'warn';
  disabled?: boolean;
  id?: string;
  title?: string;
  className?: string;
  'aria-label'?: string;
}) {
  const listId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const [pos, setPos] = useState<CSSProperties>({});

  const items: SelectOption[] =
    placeholder !== undefined ? [{ value: '', label: placeholder }, ...options] : options;
  const current = String(value ?? '');
  const selected = items.findIndex((o) => String(o.value) === current);
  const shown = selected >= 0 ? items[selected].label : placeholder;

  const enabled = (i: number) => i >= 0 && i < items.length && !items[i].disabled;
  /** Next enabled index from `from` in direction `step`, or `from` if there is none. */
  const step = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < items.length; i += dir) if (enabled(i)) return i;
    return from;
  };
  const first = () => step(-1, 1);
  const last = () => step(items.length, -1);

  const show = () => {
    if (disabled) return;
    setCursor(enabled(selected) ? selected : first());
    setOpen(true);
  };
  const close = () => setOpen(false);
  const pick = (i: number) => {
    if (!enabled(i)) return;
    if (String(items[i].value) !== current) onChange(String(items[i].value));
    close();
    btnRef.current?.focus();
  };

  /** Type-ahead: letters typed within 0.6s add up; finds the next option starting with them. */
  const match = (key: string, from: number) => {
    const now = Date.now();
    const t = typed.current;
    t.text = now - t.at > 600 ? key : t.text + key;
    t.at = now;
    const needle = t.text.toLocaleLowerCase();
    // A repeated single letter cycles through matches; a longer word stays on the current one.
    const start = t.text.length === 1 ? from + 1 : from;
    for (let k = 0; k < items.length; k++) {
      const i = (start + k + items.length) % items.length;
      if (enabled(i) && textOf(items[i].label).toLocaleLowerCase().startsWith(needle)) return i;
    }
    return -1;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const k = e.key;
    if (!open) {
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') {
        e.preventDefault();
        show();
      } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Closed: typing changes the value directly, like a native select.
        const i = match(k, selected);
        if (i >= 0 && String(items[i].value) !== current) onChange(String(items[i].value));
      }
      return;
    }
    if (k === 'ArrowDown') setCursor((c) => step(c, 1));
    else if (k === 'ArrowUp') setCursor((c) => step(c, -1));
    else if (k === 'Home' || k === 'PageUp') setCursor(first());
    else if (k === 'End' || k === 'PageDown') setCursor(last());
    else if (k === 'Enter' || (k === ' ' && !typed.current.text)) pick(cursor);
    else if (k === 'Escape') {
      e.stopPropagation();
      close();
    } else if (k === 'Tab') {
      close();
      return;
    } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const i = match(k, cursor);
      if (i >= 0) setCursor(i);
    } else return;
    e.preventDefault();
  };

  // Place the list under the trigger (above when there's more room there), inside the viewport.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const btn = btnRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const below = window.innerHeight - r.bottom - GAP - EDGE;
      const above = r.top - GAP - EDGE;
      const up = below < 200 && above > below;
      const width = listRef.current?.offsetWidth ?? r.width;
      setPos({
        left: Math.max(EDGE, Math.min(r.left, window.innerWidth - EDGE - width)),
        minWidth: r.width,
        maxHeight: Math.min(MAX_LIST_HEIGHT, up ? above : below),
        ...(up ? { bottom: window.innerHeight - r.top + GAP } : { top: r.bottom + GAP }),
      });
    };
    place();
    // A second pass once the list has its real width (it can be wider than the trigger).
    const raf = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  // Click outside closes; focus stays on the button while the list is open. A click on the
  // surrounding <label> is left to the button's own toggle (the label forwards it there).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      const owner = btnRef.current?.closest('label') ?? btnRef.current;
      if (!owner?.contains(t) && !listRef.current?.contains(t)) close();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  useEffect(() => {
    if (open && cursor >= 0) {
      listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, cursor]);

  const cls = [
    s.wrap,
    s[variant],
    s[size],
    fit ? s.fit : '',
    active ? s.active : '',
    tone ? s[tone] : '',
    disabled ? s.disabled : '',
    open ? s.open : '',
    label === undefined ? (className ?? '') : '',
  ]
    .filter(Boolean)
    .join(' ');

  const control = (
    <span className={cls}>
      <button
        ref={btnRef}
        type="button"
        id={id}
        className={s.select}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && cursor >= 0 ? `${listId}-${cursor}` : undefined}
        aria-label={ariaLabel}
        title={title}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={onKeyDown}
        onBlur={close}
      >
        <span className={s.value}>{shown}</span>
      </button>
      <ChevronDown className={s.chevron} size={size === 'sm' ? 14 : 16} aria-hidden />
      {open &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className={`${s.list} ${s[`list_${size}`]}`}
            style={pos}
            // Keep focus (and the open state) on the button while clicking inside the list.
            onMouseDown={(e) => e.preventDefault()}
          >
            {items.map((o, i) => (
              <li
                key={`${o.value}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === selected}
                aria-disabled={o.disabled || undefined}
                className={[
                  s.option,
                  i === cursor ? s.optionCursor : '',
                  i === selected ? s.optionSelected : '',
                  o.disabled ? s.optionDisabled : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseMove={() => enabled(i) && i !== cursor && setCursor(i)}
                onClick={() => pick(i)}
              >
                <span className={s.optionLabel}>{o.label}</span>
                {i === selected && <Check className={s.check} size={16} aria-hidden />}
              </li>
            ))}
          </ul>,
          document.body,
        )}
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
