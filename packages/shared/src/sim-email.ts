// ─── Simulated test email (Phase 4) ───
//
// One renderer shared by the worker and the admin preview, so what an editor previews is exactly
// what gets delivered.
//
// Where the safety properties live (R1–R4), since they are deliberately NOT in the visible body:
// - consent is taken up front, not per message: tests only go to someone who turned them on and
//   retyped the confirmation sentence, and only ever to their own address (R1);
// - every message carries SIM_EMAIL_HEADERS, an invisible marker set by the mail service, so the
//   mail can always be identified as an exercise when reconciling (R3) without handing the learner
//   a "scroll to the bottom and look for the footer" shortcut that would void the exercise;
// - only a display NAME is imitated, and only for the fictional brands in the handbook; the envelope
//   address is RedFlag's own domain and is set by the mail service, never by content (R3/R4);
// - acting on the mail leads straight to the teach page, which says it was practice.
//
// Body format (what editors type):
//   blank line  → new paragraph
//   {{name}}    → how this user is greeted
//   [[text]]    → the one tracked link

export interface SimEmailInput {
  locale: 'en' | 'vi';
  subject: string;
  body: string;
  /** The user's name; blank → a neutral word for the locale. */
  name?: string | null;
  /** Where [[text]] points: the per-campaign click URL. */
  linkUrl: string;
  /** 1×1 open-tracking image. Omitted in previews. */
  openPixelUrl?: string;
}

export interface SimEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Headers every simulated email carries. Invisible while reading, but enough for a mail admin, a
 * filter rule or a support request to tell an exercise from a real message (R3).
 */
export const SIM_EMAIL_HEADERS: Record<string, string> = {
  'X-RedFlag-Simulation': 'yes',
  'X-RedFlag-Note': 'Scam-awareness exercise sent by RedFlag to a user who opted in to being tested.',
  'Auto-Submitted': 'auto-generated',
};

const GREETING_FALLBACK = { en: 'there', vi: 'bạn' } as const;

const LINK_MARKER = /\[\[([^\]]+)\]\]/;

export const escapeHtml = (v: string): string =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const unescapeHtml = (v: string): string =>
  v
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');

/** Body with the greeting filled in; a blank name falls back to a neutral word. */
function fillName(body: string, locale: 'en' | 'vi', name?: string | null): string {
  const who = (name ?? '').trim() || GREETING_FALLBACK[locale];
  return body.split('{{name}}').join(who);
}

/** Paragraphs of the body, still carrying their [[link]] markers. */
export function simEmailParagraphs(body: string, locale: 'en' | 'vi', name?: string | null): string[] {
  return fillName(body, locale, name)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Renders one paragraph, turning the first [[text]] into `link(text)` and escaping the rest. */
function renderParagraph(paragraph: string, link: (text: string) => string): string {
  const match = LINK_MARKER.exec(paragraph);
  if (!match) return escapeHtml(paragraph);
  const [marker, text] = match;
  const before = paragraph.slice(0, match.index);
  const after = paragraph.slice(match.index + marker.length);
  return escapeHtml(before) + link(text) + escapeHtml(after);
}

/** Renders the email an opted-in user receives, in both HTML and plain text. */
export function renderSimEmail(input: SimEmailInput): SimEmail {
  const paragraphs = simEmailParagraphs(input.body, input.locale, input.name);

  const htmlBody = paragraphs
    .map((p) => {
      const inner = renderParagraph(p, (text) => {
        // A paragraph that is nothing but the link becomes a button; otherwise it stays inline.
        const isOwnParagraph = p.trim() === `[[${text}]]`;
        const style = isOwnParagraph
          ? 'display:inline-block;padding:11px 20px;border-radius:6px;background:#1a56db;color:#ffffff;text-decoration:none;font-weight:600'
          : 'color:#1a56db';
        return `<a href="${escapeHtml(input.linkUrl)}" style="${style}">${escapeHtml(text)}</a>`;
      });
      return `<p style="margin:0 0 16px;line-height:1.6">${inner}</p>`;
    })
    .join('\n');

  const pixel = input.openPixelUrl
    ? `<img src="${escapeHtml(input.openPixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">`
    : '';

  const html = `<!doctype html>
<html lang="${input.locale}">
<body style="margin:0;padding:24px;background:#f5f5f5;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937">
<div style="max-width:560px;margin:0 auto;padding:28px;background:#ffffff;border-radius:10px">
${htmlBody}
</div>
${pixel}
</body>
</html>`;

  const text = paragraphs
    .map((p) => unescapeHtml(renderParagraph(p, (text) => `${text}: ${input.linkUrl}`)))
    .join('\n\n');

  return { subject: input.subject, html, text };
}
