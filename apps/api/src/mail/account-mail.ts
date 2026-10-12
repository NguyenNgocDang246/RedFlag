import { Locale } from '@prisma/client';
import { escapeHtml } from '@redflag/shared';

/** RedFlag's own transactional mail (never a simulation — those go through renderSimEmail). */
export type AccountMailKind = 'verify' | 'reset' | 'passwordChanged' | 'googleAccount';

export interface AccountMail {
  subject: string;
  html: string;
  text: string;
}

interface MailCopy {
  subject: string;
  heading: string;
  paragraphs: string[];
  button: string;
}

/**
 * One locale per message (we know the user's own), so nobody reads a mail written half in a
 * language they don't speak. Same idea as TEST_WARNING_I18N in identity/confirmation.ts.
 */
const COPY: Record<Locale, Record<AccountMailKind, MailCopy>> = {
  en: {
    verify: {
      subject: 'Confirm your email for RedFlag',
      heading: 'Confirm your email',
      paragraphs: [
        'Tap the button below and your RedFlag account is ready to use.',
        'The link works for 24 hours. If it expires, you can ask for a new one on the login page.',
      ],
      button: 'Confirm my email',
    },
    reset: {
      subject: 'Reset your RedFlag password',
      heading: 'Set a new password',
      paragraphs: [
        'Someone asked to reset the password for this account. If that was you, tap the button below.',
        'The link works for one hour and only once. If you did not ask for this, ignore this email — your password stays as it is.',
      ],
      button: 'Set a new password',
    },
    passwordChanged: {
      subject: 'Your RedFlag password was changed',
      heading: 'Your password was changed',
      paragraphs: [
        'The password for your RedFlag account has just been changed, and your other devices were signed out.',
        'If this was not you, reset your password now and check the devices listed on your account page.',
      ],
      button: 'Reset my password',
    },
    googleAccount: {
      subject: 'Signing in to RedFlag',
      heading: 'This account signs in with Google',
      paragraphs: [
        'You asked to reset a password, but this account was created with Google, so it does not have one.',
        'Open the login page and use “Continue with Google”. Once you are in, you can set a password on your account page if you want one.',
      ],
      button: 'Go to login',
    },
  },
  vi: {
    verify: {
      subject: 'Xác nhận email cho RedFlag',
      heading: 'Xác nhận email của bạn',
      paragraphs: [
        'Bạn bấm vào nút bên dưới là tài khoản RedFlag dùng được ngay.',
        'Đường link dùng được trong 24 giờ. Nếu hết hạn, bạn xin link mới ở trang đăng nhập.',
      ],
      button: 'Xác nhận email',
    },
    reset: {
      subject: 'Đặt lại mật khẩu RedFlag',
      heading: 'Đặt mật khẩu mới',
      paragraphs: [
        'Có người yêu cầu đặt lại mật khẩu cho tài khoản này. Nếu là bạn, hãy bấm nút bên dưới.',
        'Đường link dùng được trong một giờ và chỉ dùng một lần. Nếu không phải bạn yêu cầu thì bỏ qua email này, mật khẩu của bạn vẫn giữ nguyên.',
      ],
      button: 'Đặt mật khẩu mới',
    },
    passwordChanged: {
      subject: 'Mật khẩu RedFlag của bạn đã đổi',
      heading: 'Mật khẩu của bạn đã được đổi',
      paragraphs: [
        'Mật khẩu tài khoản RedFlag vừa được đổi, và các thiết bị khác đã bị đăng xuất.',
        'Nếu không phải bạn làm việc này, hãy đặt lại mật khẩu ngay và xem lại danh sách thiết bị trong trang tài khoản.',
      ],
      button: 'Đặt lại mật khẩu',
    },
    googleAccount: {
      subject: 'Đăng nhập vào RedFlag',
      heading: 'Tài khoản này đăng nhập bằng Google',
      paragraphs: [
        'Bạn vừa yêu cầu đặt lại mật khẩu, nhưng tài khoản này được tạo bằng Google nên chưa có mật khẩu nào.',
        'Bạn vào trang đăng nhập rồi bấm “Tiếp tục với Google”. Vào được rồi, nếu muốn có mật khẩu thì đặt trong trang tài khoản.',
      ],
      button: 'Đến trang đăng nhập',
    },
  },
};

/** Shown under every message: the product teaches people to distrust links, so say what we never do. */
const FOOTER: Record<Locale, { copyHint: string; promise: string }> = {
  en: {
    copyHint: 'If the button does not work, copy this link into your browser:',
    promise: 'RedFlag will never ask you for a password, an OTP or a card number by email.',
  },
  vi: {
    copyHint: 'Nếu nút không bấm được, bạn copy đường link này vào thanh địa chỉ:',
    promise: 'RedFlag không bao giờ hỏi mật khẩu, mã OTP hay số thẻ của bạn qua email.',
  },
};

/** Renders one of RedFlag's own emails, in the user's language, as HTML plus a plain-text twin. */
export function renderAccountMail(
  kind: AccountMailKind,
  locale: Locale,
  args: { link: string },
): AccountMail {
  const copy = COPY[locale][kind];
  const footer = FOOTER[locale];
  const link = escapeHtml(args.link);

  const body = copy.paragraphs
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6">${escapeHtml(p)}</p>`)
    .join('\n');

  const html = `<!doctype html>
<html lang="${locale}">
<body style="margin:0;padding:24px;background:#f5f5f5;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937">
<div style="max-width:560px;margin:0 auto;padding:28px;background:#ffffff;border-radius:10px">
<h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#111827">${escapeHtml(copy.heading)}</h1>
${body}
<p style="margin:24px 0">
<a href="${link}" style="display:inline-block;padding:12px 22px;border-radius:8px;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:600">${escapeHtml(copy.button)}</a>
</p>
<p style="margin:0 0 6px;font-size:13px;color:#6b7280">${escapeHtml(footer.copyHint)}</p>
<p style="margin:0 0 20px;font-size:13px;word-break:break-all"><a href="${link}" style="color:#dc2626">${link}</a></p>
<p style="margin:0;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280">${escapeHtml(footer.promise)}</p>
</div>
</body>
</html>`;

  const text = [
    copy.heading,
    '',
    ...copy.paragraphs,
    '',
    `${copy.button}: ${args.link}`,
    '',
    footer.promise,
  ].join('\n');

  return { subject: copy.subject, html, text };
}
