import { QuizKind } from '@redflag/shared';

/**
 * Form structure per shell kind — matches the *Scenario interfaces in @redflag/shared.
 * One config table instead of 8 hand-written forms; a new shell = one new entry here.
 */
export type FieldType =
  | 'span' // required Span (text, may carry a signal → hotspot)
  | 'spanOpt' // optional Span
  | 'text' // optional plain string (never a hotspot)
  | 'spanList'
  | 'spanListOpt' // may be empty
  | 'bubbles' // chat: [{ from, text: Span }]
  | 'attachments'; // email: [{ name, size?, signal? }]

/** Field labels are admin UI text → one per UI language. */
export type Localized = { en: string; vi: string };

export interface FieldDef {
  key: string;
  label: Localized;
  type: FieldType;
  hint?: Localized;
  /** Example content, in the language of the translation being edited (not the UI language). */
  placeholder: Localized;
}

const CONSENT_FIELDS: FieldDef[] = [
  {
    key: 'appName',
    label: { en: 'App name', vi: 'Tên ứng dụng' },
    type: 'span',
    placeholder: { en: 'Calendar Sync Pro', vi: 'Lịch Đồng Bộ Pro' },
  },
  {
    key: 'publisher',
    label: {
      en: 'Developer (e.g. contact email)',
      vi: 'Nhà phát triển (vd email liên hệ)',
    },
    type: 'spanOpt',
    placeholder: { en: 'support@calendarsync-app.com', vi: 'hotro@lichdongbo-app.com' },
  },
  {
    key: 'permissions',
    label: { en: 'Requested permissions', vi: 'Quyền xin cấp' },
    type: 'spanList',
    placeholder: {
      en: 'Read, send and delete your email',
      vi: 'Đọc, gửi và xoá email của bạn',
    },
  },
];
const INSTALL_FIELDS: FieldDef[] = [
  {
    key: 'appName',
    label: { en: 'App name', vi: 'Tên ứng dụng' },
    type: 'span',
    placeholder: { en: 'Northstar Security Helper', vi: 'Trợ lý bảo mật Sao Mai' },
  },
  {
    key: 'publisher',
    label: { en: 'Play Protect warning', vi: 'Cảnh báo Play Protect' },
    type: 'spanOpt',
    placeholder: {
      en: 'Play Protect: this app was not verified',
      vi: 'Play Protect: ứng dụng này chưa được xác minh',
    },
  },
  {
    key: 'permissions',
    label: { en: 'Permissions the app gets', vi: 'Quyền ứng dụng sẽ có' },
    type: 'spanList',
    placeholder: { en: 'Read your text messages (SMS)', vi: 'Đọc tin nhắn SMS của bạn' },
  },
];

export const KIND_FIELDS: Record<string, FieldDef[]> = {
  [QuizKind.EMAIL_INSPECTION]: [
    {
      key: 'senderName',
      label: { en: 'Sender name', vi: 'Tên người gửi' },
      type: 'span',
      placeholder: { en: 'Northstar Bank', vi: 'Sao Mai Bank' },
    },
    {
      key: 'senderAddress',
      label: { en: 'Sender address', vi: 'Địa chỉ người gửi' },
      type: 'span',
      hint: {
        en: 'Where look-alike domains / sender mismatches usually show',
        vi: 'Chỗ hay lộ tên miền giả / người gửi không khớp',
      },
      placeholder: {
        en: 'alerts@northstar-bank-secure.com',
        vi: 'thongbao@saomaibank-xacminh.com',
      },
    },
    {
      key: 'to',
      label: { en: 'To', vi: 'Gửi tới' },
      type: 'text',
      placeholder: { en: 'you@example.com', vi: 'ban@example.com' },
    },
    {
      key: 'time',
      label: { en: 'Displayed time', vi: 'Giờ hiển thị' },
      type: 'text',
      placeholder: { en: '09:12', vi: '09:12' },
    },
    {
      key: 'subject',
      label: { en: 'Subject', vi: 'Tiêu đề' },
      type: 'span',
      placeholder: {
        en: 'Your account will be locked in 24 hours',
        vi: 'Tài khoản của bạn sẽ bị khoá sau 24 giờ',
      },
    },
    {
      key: 'body',
      label: {
        en: 'Body (one line = one paragraph)',
        vi: 'Nội dung (mỗi dòng = 1 đoạn)',
      },
      type: 'spanList',
      placeholder: {
        en: 'Hi Alex, we noticed an unusual sign-in to your account.',
        vi: 'Chào Minh Anh, chúng tôi phát hiện đăng nhập bất thường vào tài khoản của bạn.',
      },
    },
    {
      key: 'attachments',
      label: { en: 'Attachments', vi: 'Tệp đính kèm' },
      type: 'attachments',
      placeholder: { en: 'statement_october.pdf', vi: 'saoke_thang10.pdf' },
    },
  ],
  [QuizKind.SMS_INSPECTION]: [
    {
      key: 'sender',
      label: { en: 'Sender / sender ID', vi: 'Người gửi / brandname' },
      type: 'span',
      placeholder: { en: 'NORTHSTAR', vi: 'SAOMAIBANK' },
    },
    {
      key: 'messages',
      label: {
        en: 'Messages (one line = one bubble)',
        vi: 'Tin nhắn (mỗi dòng = 1 bong bóng)',
      },
      type: 'spanList',
      placeholder: {
        en: 'Your card was charged $499. Not you? Call now.',
        vi: 'The cua ban vua bi tru 4.990.000d. Khong phai ban? Goi ngay.',
      },
    },
  ],
  [QuizKind.CHAT_INSPECTION]: [
    {
      key: 'contactName',
      label: { en: 'Contact name', vi: 'Tên liên hệ' },
      type: 'span',
      placeholder: { en: 'Emma (cousin)', vi: 'Lan (em họ)' },
    },
    {
      key: 'bubbles',
      label: { en: 'Conversation', vi: 'Hội thoại' },
      type: 'bubbles',
      placeholder: {
        en: 'Hey, can you lend me $200? I’ll pay you back tonight',
        vi: 'Chị ơi cho em mượn 2 triệu, tối em trả nhé',
      },
    },
  ],
  [QuizKind.WEB_INSPECTION]: [
    {
      key: 'urlBar',
      label: { en: 'Address bar', vi: 'Thanh địa chỉ' },
      type: 'span',
      placeholder: {
        en: 'https://northstar-bank.login-verify.com',
        vi: 'https://saomaibank.dang-nhap-xacminh.com',
      },
    },
    {
      key: 'title',
      label: { en: 'Tab title', vi: 'Tiêu đề tab' },
      type: 'text',
      placeholder: { en: 'Northstar Bank – Sign in', vi: 'Sao Mai Bank – Đăng nhập' },
    },
    {
      key: 'body',
      label: {
        en: 'Page content (one line = one paragraph)',
        vi: 'Nội dung trang (mỗi dòng = 1 đoạn)',
      },
      type: 'spanList',
      placeholder: {
        en: 'Sign in to keep your account active.',
        vi: 'Đăng nhập để tiếp tục sử dụng tài khoản.',
      },
    },
    {
      key: 'buttons',
      label: { en: 'Buttons', vi: 'Nút bấm' },
      type: 'spanListOpt',
      placeholder: { en: 'Sign in', vi: 'Đăng nhập' },
    },
  ],
  [QuizKind.QR_INSPECTION]: [
    {
      key: 'posterText',
      label: { en: 'Poster text', vi: 'Chữ trên poster' },
      type: 'spanOpt',
      placeholder: {
        en: 'Scan to pay for parking',
        vi: 'Quét mã để thanh toán phí gửi xe',
      },
    },
    {
      key: 'decodedUrl',
      label: { en: 'URL after scanning', vi: 'URL sau khi quét' },
      type: 'span',
      placeholder: {
        en: 'https://parking-pay.top/p/123',
        vi: 'https://thanhtoan-guixe.top/p/123',
      },
    },
  ],
  [QuizKind.FILE_INSPECTION]: [
    {
      key: 'fileName',
      label: { en: 'File name', vi: 'Tên tệp' },
      type: 'span',
      placeholder: { en: 'Payroll_Q3.xlsm', vi: 'BangLuong_Q3.xlsm' },
    },
    {
      key: 'prompt',
      label: { en: 'Warning bar', vi: 'Thanh cảnh báo' },
      type: 'text',
      placeholder: {
        en: 'Enable content to view this document',
        vi: 'Bật nội dung để xem tài liệu này',
      },
    },
    {
      key: 'body',
      label: { en: 'File content', vi: 'Nội dung tệp' },
      type: 'spanListOpt',
      placeholder: {
        en: 'This document is protected. Enable macros to continue.',
        vi: 'Tài liệu được bảo vệ. Bật macro để tiếp tục.',
      },
    },
  ],
  [QuizKind.APP_CONSENT]: INSTALL_FIELDS,
  [QuizKind.OAUTH_CONSENT]: CONSENT_FIELDS,
};

/** Empty scenarioData for a shell kind (required fields present so the form + preview render). */
export function emptyScenario(kind: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of KIND_FIELDS[kind] ?? []) {
    if (f.type === 'span') out[f.key] = '';
    else if (f.type === 'spanList') out[f.key] = [''];
    else if (f.type === 'bubbles') out[f.key] = [{ from: 'them', text: '' }];
  }
  return out;
}

/** Drops empty optional fields before saving (keeps JSON as compact as the seed). */
export function cleanScenario(
  kind: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of KIND_FIELDS[kind] ?? []) {
    const v = data[f.key];
    if (v === undefined) continue;
    if (f.type === 'text' && (typeof v !== 'string' || !v.trim())) continue;
    if (
      f.type === 'spanOpt' &&
      (v === '' || (typeof v === 'object' && !(v as { text: string }).text))
    )
      continue;
    if (
      (f.type === 'spanListOpt' || f.type === 'attachments') &&
      Array.isArray(v) &&
      v.length === 0
    )
      continue;
    if (f.type === 'attachments' && Array.isArray(v)) {
      out[f.key] = v.map(
        (a: { name: string; size?: string; signal?: string; note?: string }) => {
          const att: Record<string, string> = { name: a.name };
          if (a.size) att.size = a.size;
          if (a.signal) att.signal = a.signal;
          if (a.signal && a.note) att.note = a.note;
          return att;
        },
      );
      continue;
    }
    out[f.key] = v;
  }
  return out;
}
