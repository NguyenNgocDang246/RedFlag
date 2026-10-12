import { Locale } from '@prisma/client';

/** Warning text version — bump on text changes, for consent auditing. */
export const CONFIRMATION_TEXT_VERSION = 'v2';

/** Where a user may report a test email. Both come from the environment, never hard-coded. */
export interface ReportChannels {
  /** Inbox that accepts forwarded exercise emails. */
  address: string;
  /** The page with the report button. */
  pageUrl: string;
}

export function reportChannels(env: NodeJS.ProcessEnv = process.env): ReportChannels {
  const web = (env.WEB_PUBLIC_URL ?? 'http://localhost:4001').replace(/\/+$/, '');
  return {
    address: env.REPORT_EMAIL ?? 'report@redflag.local',
    pageUrl: `${web}/report`,
  };
}

/**
 * What the user must read before turning on surprise email tests, and the sentence they retype to
 * confirm they read it (type-to-confirm, not a checkbox — R1).
 *
 * The warning exists because of one real risk: reporting an exercise with the mail app's own
 * "Report phishing" button sends it to their mail provider, not to us. So it names the two routes
 * that do reach RedFlag, and says plainly where the button is.
 */
export const TEST_WARNING_I18N: Record<
  Locale,
  { warning: (c: ReportChannels) => string; confirmPhrase: string }
> = {
  en: {
    warning: (c) =>
      [
        'From time to time you will get a fake scam email from us. Spotting it and reporting it is the exercise.',
        `To report one, open ${c.pageUrl} and press the button next to that email, or forward the email to ${c.address}.`,
        'Please do not use your mail app’s own "Report phishing" button for these. That report goes to your mail provider, not to us, and it can make a mess of your own inbox.',
        'You can pause or stop these emails at any time on your own page.',
      ].join('\n\n'),
    confirmPhrase: 'I have read and understood',
  },
  vi: {
    warning: (c) =>
      [
        'Thỉnh thoảng bạn sẽ nhận được một email lừa đảo giả từ chúng tôi. Nhận ra và báo lại chính là bài tập.',
        `Để báo, bạn mở ${c.pageUrl} rồi bấm nút bên cạnh email đó, hoặc chuyển tiếp email tới ${c.address}.`,
        'Đừng dùng nút "Báo cáo lừa đảo" có sẵn trong ứng dụng mail cho những email này. Báo cáo đó đi tới nhà cung cấp mail chứ không về chúng tôi, và có thể làm rối hộp thư của chính bạn.',
        'Bạn có thể tạm dừng hoặc tắt hẳn bất cứ lúc nào ở trang cá nhân.',
      ].join('\n\n'),
    confirmPhrase: 'Tôi đã đọc và hiểu',
  },
};

/** The warning for a locale, with the real addresses filled in. */
export function warningText(locale: Locale, env?: NodeJS.ProcessEnv): string {
  return (TEST_WARNING_I18N[locale] ?? TEST_WARNING_I18N.en).warning(reportChannels(env));
}

/** Normalizes input so matching is forgiving for non-technical users (R9). */
export function normalizePhrase(input: string): string {
  return input
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!…]+$/u, '');
}

export function expectedPhrase(locale: Locale): string {
  return (TEST_WARNING_I18N[locale] ?? TEST_WARNING_I18N.en).confirmPhrase;
}

export function confirmationMatches(input: string | undefined, locale: Locale): boolean {
  if (!input) return false;
  return normalizePhrase(input) === normalizePhrase(expectedPhrase(locale));
}
