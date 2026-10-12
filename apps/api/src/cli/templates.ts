import { QuizKind, SignalCode } from '@redflag/shared';

/** Standard prompts per shell group — shared by seed and the CLI quiz template. */
export const PROMPT = {
  email: {
    en: 'Safe or scam? Read this email, then tap anything suspicious.',
    vi: 'An toàn hay lừa đảo? Đọc email này rồi chạm vào chỗ đáng ngờ.',
  },
  sms: {
    en: 'Safe or scam? Read this SMS, then tap anything suspicious.',
    vi: 'An toàn hay lừa đảo? Đọc tin nhắn này rồi chạm vào chỗ đáng ngờ.',
  },
  chat: {
    en: 'Safe or scam? Read this chat, then tap anything suspicious.',
    vi: 'An toàn hay lừa đảo? Đọc đoạn chat này rồi chạm vào chỗ đáng ngờ.',
  },
  web: {
    en: 'Safe or scam? Look at this page, then tap anything suspicious.',
    vi: 'An toàn hay lừa đảo? Nhìn trang này rồi chạm vào chỗ đáng ngờ.',
  },
  qr: {
    en: 'Safe or scam? Scanning reveals this address — tap anything suspicious.',
    vi: 'An toàn hay lừa đảo? Quét ra địa chỉ này — chạm vào chỗ đáng ngờ.',
  },
  app: {
    en: 'Safe or scam? An app asks for these permissions — tap anything suspicious.',
    vi: 'An toàn hay lừa đảo? Một app xin các quyền này — chạm vào chỗ đáng ngờ.',
  },
  file: {
    en: 'Safe or scam? You opened this attachment — tap anything suspicious.',
    vi: 'An toàn hay lừa đảo? Bạn vừa mở tệp đính kèm này — chạm vào chỗ đáng ngờ.',
  },
} as const;

const PROMPT_OF: Record<string, keyof typeof PROMPT> = {
  [QuizKind.EMAIL_INSPECTION]: 'email',
  [QuizKind.SMS_INSPECTION]: 'sms',
  [QuizKind.CHAT_INSPECTION]: 'chat',
  [QuizKind.WEB_INSPECTION]: 'web',
  [QuizKind.QR_INSPECTION]: 'qr',
  [QuizKind.APP_CONSENT]: 'app',
  [QuizKind.OAUTH_CONSENT]: 'app',
  [QuizKind.FILE_INSPECTION]: 'file',
};

const S = SignalCode;
/** Correct spot = signal IN signalCodes; `note` (required, ≥60 chars, unique) says what the scammer does here and why it matters in THIS quiz. */
const spot = (text: string, signal: string) => ({
  text,
  signal,
  note: '<Kẻ gian đang làm gì ở chỗ này + vì sao đáng sợ trong bài này + người thật sẽ làm khác thế nào>',
});
/** Decoy = signal NOT in signalCodes; `note` (required, ≥60 chars, unique) says why it is normal here, why it proves nothing and what the real evidence is. */
const decoy = (text: string, signal: string) => ({
  text,
  signal,
  note: '<Vì sao chỗ này BÌNH THƯỜNG trong bài này + vì sao nó không chứng minh gì + cái gì mới là bằng chứng>',
});

/**
 * `scenarioData` skeleton per shell kind. The sample is a SCAM:
 * the URGENCY spot is CORRECT (in signalCodes), the rest are DECOYS.
 * Replace <…> with real content. At least 1 decoy is required; every hotspot (correct or decoy) needs its own note.
 * Full rules: docs/quiz-authoring.md.
 */
function scenario(kind: string): Record<string, unknown> {
  switch (kind) {
    case QuizKind.EMAIL_INSPECTION:
      return {
        senderName: decoy('<Tên hiển thị người gửi>', S.SENDER_MISMATCH),
        senderAddress: '<dia-chi@ten-mien.com>',
        subject: '<Tiêu đề email>',
        body: ['<Lời chào>', spot('<Câu hối thúc — chỗ ĐÚNG>', S.URGENCY), '<Đoạn thường>'],
        attachments: [],
      };
    case QuizKind.SMS_INSPECTION:
      return {
        sender: decoy('<BRANDNAME>', S.SENDER_MISMATCH),
        messages: [spot('<Câu hối thúc — chỗ ĐÚNG>', S.URGENCY), '<Câu thường>'],
      };
    case QuizKind.CHAT_INSPECTION:
      return {
        contactName: decoy('<Tên liên hệ>', S.SENDER_MISMATCH),
        bubbles: [
          { from: 'them', text: '<Tin mở đầu>' },
          { from: 'them', text: spot('<Tin hối thúc — chỗ ĐÚNG>', S.URGENCY) },
          { from: 'me', text: '<Tin trả lời của bạn>' },
        ],
      };
    case QuizKind.WEB_INSPECTION:
      return {
        urlBar: decoy('https://<ten-mien>/<duong-dan>', S.LOOKALIKE_DOMAIN),
        title: '<Tiêu đề tab>',
        body: ['<Nội dung trang>', spot('<Câu hối thúc — chỗ ĐÚNG>', S.URGENCY)],
        buttons: ['<Nút bấm>'],
      };
    case QuizKind.QR_INSPECTION:
      return {
        posterText: spot('<Chữ trên poster — chỗ ĐÚNG>', S.URGENCY),
        decodedUrl: decoy('https://<ten-mien>/<duong-dan>', S.LOOKALIKE_DOMAIN),
      };
    case QuizKind.FILE_INSPECTION:
      return {
        fileName: decoy('<ten_tep.docx>', S.SUSPICIOUS_ATTACHMENT),
        prompt: '<Chữ trên nút, vd. Bật nội dung>',
        body: [spot('<Câu hối thúc — chỗ ĐÚNG>', S.URGENCY), '<Nội dung tệp>'],
      };
    case QuizKind.APP_CONSENT:
    case QuizKind.OAUTH_CONSENT:
      return {
        appName: decoy('<Tên app>', S.TOO_GOOD),
        publisher: '<Nhà phát hành>',
        permissions: [spot('<Quyền đòi gấp — chỗ ĐÚNG>', S.URGENCY), '<Quyền bình thường>'],
      };
    default:
      throw new Error(`Loại vỏ không hỗ trợ: ${kind}`);
  }
}

/**
 * JSON skeleton matching SaveQuizDto for `quiz create --file`.
 * Sample: scam, difficulty 1, draft, not public. EN/VI share the structure —
 * use locale-specific brands (handbook) and a neutral, spoiler-free title.
 */
export function quizTemplate(kind: string) {
  const group = PROMPT_OF[kind];
  if (!group) throw new Error(`Loại vỏ không hỗ trợ: ${kind}`);
  const text = (locale: 'en' | 'vi') => ({
    title: locale === 'vi' ? '<Tiêu đề trung tính — không lộ đáp án>' : '<Neutral title — no spoilers>',
    prompt: PROMPT[group][locale],
    scenario: '',
    explanation:
      locale === 'vi'
        ? '<1–3 câu: vì sao lừa/thật, nêu đủ dấu hiệu, nên làm gì>'
        : '<1–3 sentences: why scam/genuine, every sign, what to do>',
    scenarioData: scenario(kind),
  });
  return {
    kind,
    isScam: true,
    difficultyLevel: 1,
    categoryCode: null,
    isPublic: false,
    order: 0,
    signalCodes: [S.URGENCY],
    translations: { en: text('en'), vi: text('vi') },
  };
}
