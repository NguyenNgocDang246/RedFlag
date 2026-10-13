/** Splits text written with blank lines between paragraphs into one string per paragraph. */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Short, single-line date for lists: "12/10/2026" (vi) / "Oct 12, 2026" (en); `withTime` adds the
 * hour ("12/10/2026 16:58"). Vietnamese uses digits, which is what people read day to day.
 */
export function formatDate(iso: string, locale: 'vi' | 'en', withTime = false): string {
  const d = new Date(iso);
  if (locale === 'vi') {
    const day = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (!withTime) return day;
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day} ${time}`;
  }
  return d.toLocaleString('en-US', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' });
}
