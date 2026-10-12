import type { ComponentType, ReactNode } from 'react';
import s from './icon-heading.module.css';

type Icon = ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;

/**
 * Heading with its icon on the same line: `[icon] Title`, subtitle below.
 * The icon is decorative and is dropped on small screens to give the text the full width.
 * `size`: `page` = page title (h1), `section` = section heading (h2), `card` = small heading inside a card.
 */
export function IconHeading({
  icon: IconCmp,
  title,
  sub,
  as,
  size = 'page',
  tone = 'accent',
  actions,
  className,
}: {
  icon: Icon;
  title: ReactNode;
  sub?: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  size?: 'page' | 'section' | 'card';
  tone?: 'accent' | 'solid' | 'neutral';
  actions?: ReactNode;
  className?: string;
}) {
  const Tag = as ?? (size === 'page' ? 'h1' : size === 'section' ? 'h2' : 'h3');
  const iconSize = size === 'page' ? 24 : size === 'section' ? 20 : 17;
  return (
    <div className={`${s.wrap} ${s[size]} ${className ?? ''}`}>
      <div className={s.main}>
        <div className={s.row}>
          <span className={`${s.icon} ${s[tone]}`} aria-hidden>
            <IconCmp size={iconSize} aria-hidden />
          </span>
          <Tag className={s.title}>{title}</Tag>
        </div>
        {sub && <div className={s.sub}>{sub}</div>}
      </div>
      {actions && <div className={s.actions}>{actions}</div>}
    </div>
  );
}
