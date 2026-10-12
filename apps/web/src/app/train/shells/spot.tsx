'use client';

import { createContext, useContext, type KeyboardEvent, type ReactNode } from 'react';
import { isHotspot, type Span } from '@redflag/shared';
import type { Locale } from '@/lib/api';
import s from './shells.module.css';

/** After grading: colors hotspots by result to teach right on the shell. */
export interface Reveal {
  matched: string[];
  missed: string[];
  wrong: string[];
}

interface SpotCtx {
  /** Keys of selected hotspots (see spotKey) — selection is PER spot, not per signal code. */
  selected: string[];
  onToggle: (key: string) => void;
  locked: boolean;
  reveal?: Reveal;
  locale: Locale;
}

export const SpotContext = createContext<SpotCtx>({
  selected: [],
  onToggle: () => {},
  locked: true,
  locale: 'en',
});

export const useShell = () => useContext(SpotContext);

/** Stable key for a hotspot: `SIGNAL|text`. */
export const spotKey = (signal: string, text: string) => `${signal}|${text}`;

/** Signal code from a hotspot key (a key without `|` is the code itself — chip selection mode). */
export const signalOfKey = (key: string) => {
  const i = key.indexOf('|');
  return i === -1 ? key : key.slice(0, i);
};

/** Distinct signals to submit, from the selected keys (plain text has no signal and is skipped). */
export const signalsOf = (keys: string[]) => [...new Set(keys.map(signalOfKey).filter(Boolean))];

/**
 * A piece of content in a shell. Correct hotspots, decoys and plain text are all selectable and react
 * EXACTLY the same (hover and tap) — the UI doesn't know right from wrong; colors only appear after grading.
 * Plain text carries no signal so it's not submitted; if selected, it shows as a wrong pick after grading.
 * `render` lets a skin format the text itself (e.g. split domain/path in the address bar).
 */
export function Spot({ span, render }: { span: Span; render?: (text: string) => ReactNode }) {
  const { selected, onToggle, locked, reveal } = useShell();

  const text = typeof span === 'string' ? span : span.text;
  const code = isHotspot(span) ? span.signal : null;
  const href = isHotspot(span) ? span.href : undefined;
  const key = spotKey(code ?? '', text);
  const picked = selected.includes(key);

  let state = '';
  if (reveal) {
    if (code && reveal.matched.includes(code)) state = s.matched;
    else if (code && reveal.missed.includes(code)) state = s.missed;
    else if (picked) state = s.wrong; // selected decoy or plain text = wrong pick
  } else if (picked) {
    state = s.picked;
  }

  const activate = () => {
    if (!locked) onToggle(key);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate();
    }
  };

  return (
    <span
      className={[s.spot, locked ? '' : s.live, href ? s.linkSpot : '', state].join(' ')}
      role={locked ? undefined : 'button'}
      tabIndex={locked ? undefined : 0}
      aria-pressed={locked ? undefined : picked}
      onClick={activate}
      onKeyDown={locked ? undefined : onKey}
    >
      {render ? render(text) : text}
      {/* Real destination, shown on hover/focus (tap) — like the URL a browser shows before you click. */}
      {href && <span className={s.linkPreview}>{href}</span>}
    </span>
  );
}

/** Plain text of a Span (for avatars, tab titles...). */
export const plain = (span: Span) => (typeof span === 'string' ? span : span.text);

/** Splits a URL into host / rest, dropping the scheme — like Chrome shows it. */
export function splitUrl(url: string): { host: string; rest: string } {
  const noScheme = url.replace(/^[a-z]+:\/\//i, '');
  const i = noScheme.search(/[/?#]/);
  return i === -1 ? { host: noScheme, rest: '' } : { host: noScheme.slice(0, i), rest: noScheme.slice(i) };
}

const URL_RE = /((?:https?:\/\/)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/[^\s]*)?)/gi;

/** Highlights links in messages like real apps (display only, not clickable). */
export function linkify(text: string, className: string): ReactNode {
  const parts = text.split(URL_RE);
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <span key={i} className={className}>
        {p}
      </span>
    ) : (
      p
    ),
  );
}

/** Stable avatar color from a name (like mail clients do). */
const AVATAR_COLORS = ['#1a73e8', '#d93025', '#188038', '#e37400', '#9334e6', '#c5221f', '#12858a', '#b06000'];
export function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
