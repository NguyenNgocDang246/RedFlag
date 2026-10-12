import type { ReactNode } from 'react';
import { Flame } from 'lucide-react';
import type { Locale, QuizQuestion } from '@/lib/api';
import { TRAIN_T } from '@/lib/i18n';
import { CategoryIcon } from './category-icon';
import { KindIcon } from './kind-icon';
import s from './train.module.css';

interface TagItem {
  key: string;
  icon: ReactNode;
  label: string;
  hot?: boolean;
}

/**
 * Quiz meta line: channel · topic · difficulty (· popular). Plain text separated by dots, full labels,
 * wrapping onto a second line when the column is narrow — nothing gets cut off.
 * Never includes the correct signals — so the answer isn't revealed.
 */
export function QuizTags({ q, locale }: { q: QuizQuestion; locale: Locale }) {
  const t = TRAIN_T[locale];
  const level = Math.min(Math.max(q.difficulty ?? 1, 1), 3);

  const items: TagItem[] = [
    { key: 'kind', icon: <KindIcon kind={q.kind} size={15} />, label: t.kinds[q.kind] ?? q.kind },
  ];
  if (q.category) {
    items.push({ key: 'cat', icon: <CategoryIcon code={q.category.code} size={15} />, label: q.category.name });
  }
  items.push({
    key: 'level',
    icon: (
      <span className={s.dots} aria-hidden>
        {[1, 2, 3].map((d) => (
          <span key={d} className={d <= level ? s.dotOn : s.dot} />
        ))}
      </span>
    ),
    label: t.difficulty[level - 1],
  });
  if (q.isPublic) items.push({ key: 'hot', icon: <Flame size={15} aria-hidden />, label: t.popular, hot: true });

  return (
    <ul className={s.tagRow}>
      {items.map((it) => (
        <li key={it.key} className={`${s.tagItem} ${it.hot ? s.tagHot : ''}`}>
          {it.icon}
          {it.label}
        </li>
      ))}
    </ul>
  );
}
