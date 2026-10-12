import { Fragment } from 'react';
import type { TestWarning } from '@/lib/api';

export interface TextLink {
  /** Exact text to turn into a link wherever it appears. */
  text: string;
  href: string;
}

/** The two report routes named in the test-email warning: the report page and the forward address. */
export function reportLinks(w: Pick<TestWarning, 'reportPageUrl' | 'reportAddress'>): TextLink[] {
  return [
    { text: w.reportPageUrl, href: w.reportPageUrl },
    { text: w.reportAddress, href: `mailto:${w.reportAddress}` },
  ];
}

/**
 * Plain text with a few known strings made clickable — e.g. the report page address inside the
 * warning the API sends as text. Only the given strings become links; nothing else is parsed.
 */
export function LinkedText({ text, links, className }: { text: string; links: TextLink[]; className?: string }) {
  const usable = links.filter((l) => l.text);
  if (usable.length === 0) return <>{text}</>;

  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Longest first, so a link whose text contains another's wins.
  const pattern = new RegExp(
    `(${[...usable].sort((a, b) => b.text.length - a.text.length).map((l) => escape(l.text)).join('|')})`,
  );

  return (
    <>
      {text.split(pattern).map((part, i) => {
        const link = usable.find((l) => l.text === part);
        return link ? (
          <a key={i} href={link.href} className={className}>
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        );
      })}
    </>
  );
}
