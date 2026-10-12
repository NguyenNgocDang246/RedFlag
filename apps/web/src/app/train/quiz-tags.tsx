'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { Flame, Gauge } from 'lucide-react';
import type { Locale, QuizQuestion } from '@/lib/api';
import { TRAIN_T } from '@/lib/i18n';
import { CategoryIcon } from './category-icon';
import { KindIcon } from './kind-icon';
import s from './train.module.css';

const MAX_VISIBLE = 3;
const MAX_VISIBLE_NARROW = 2; // narrow screens: 3 tags + "+N" don't fit on one row

const NARROW = '(max-width: 600px)';
function useNarrow(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(NARROW);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(NARROW).matches,
    () => false, // SSR: assume a wide screen
  );
}

interface TagItem {
  key: string;
  icon: ReactNode;
  label: string;
  extra?: ReactNode;
  hot?: boolean;
}

/**
 * Quiz tags: always one row. At most 3 tags (narrow: 2); the rest collapse into a "+N" chip with a tooltip.
 * Long tags are truncated with "…" (tooltip shows the full text).
 * Never includes the correct signals — so the answer isn't revealed.
 */
export function QuizTags({ q, locale }: { q: QuizQuestion; locale: Locale }) {
  const t = TRAIN_T[locale];
  const level = Math.min(Math.max(q.difficulty ?? 1, 1), 3);
  const max = useNarrow() ? MAX_VISIBLE_NARROW : MAX_VISIBLE;

  const items: TagItem[] = [
    { key: 'kind', icon: <KindIcon kind={q.kind} size={14} />, label: t.kinds[q.kind] ?? q.kind },
  ];
  if (q.category) {
    items.push({ key: 'cat', icon: <CategoryIcon code={q.category.code} size={14} />, label: q.category.name });
  }
  items.push({
    key: 'level',
    icon: <Gauge size={14} aria-hidden />,
    label: t.difficulty[level - 1],
    extra: (
      <span className={s.dots} aria-hidden>
        {[1, 2, 3].map((d) => (
          <span key={d} className={d <= level ? s.dotOn : s.dot} />
        ))}
      </span>
    ),
  });
  if (q.isPublic) items.push({ key: 'hot', icon: <Flame size={14} aria-hidden />, label: t.popular, hot: true });

  const visible = items.slice(0, max);
  const rest = items.slice(max);

  return (
    <div className={s.tagRow}>
      {visible.map((it) => (
        <Chip key={it.key} item={it} />
      ))}
      {rest.length > 0 && (
        <button type="button" className={`${s.tagChip} ${s.tagMore}`} aria-label={rest.map((r) => r.label).join(', ')}>
          +{rest.length}
          <span className={s.tooltip} role="tooltip">
            {rest.map((it) => (
              <Chip key={it.key} item={it} full />
            ))}
          </span>
        </button>
      )}
    </div>
  );
}

function Chip({ item, full = false }: { item: TagItem; full?: boolean }) {
  return (
    <span className={`${s.tagChip} ${item.hot ? s.tagHot : ''} ${full ? s.tagFull : ''}`} title={item.label}>
      {item.icon}
      <span className={s.tagText}>{item.label}</span>
      {item.extra}
    </span>
  );
}
