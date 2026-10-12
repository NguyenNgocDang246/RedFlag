// ─── Admin access granted via ADMIN_EMAILS env ───

/** "a@x.com, B@y.com" → ['a@x.com', 'b@y.com']. */
export function parseAdminEmails(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
