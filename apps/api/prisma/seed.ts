import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { config as loadDotenv } from 'dotenv';
import {
  CategoryCode,
  QuizKind,
  SignalCode,
  checkQuizHotspots,
  checkScenarioShape,
  parseAdminEmails,
  type ScenarioData,
} from '@redflag/shared';
import { EXTRA_BRANDS, EXTRA_CATEGORIES, RERATE } from './seed-data/common';
import { QUIZ_EMAIL } from './seed-data/quiz-email';
import { QUIZ_MIXED } from './seed-data/quiz-mixed';

loadDotenv({ path: resolve(__dirname, '../../../.env') }); // shared .env at the repo root (ADMIN_EMAILS...)
const prisma = new PrismaClient();

// ─── Signal content — bilingual EN/VI ───
const SIGNAL_I18N: Record<string, { en: [string, string]; vi: [string, string] }> = {
  [SignalCode.LOOKALIKE_DOMAIN]: {
    en: ['Look-alike domain', 'The web address looks almost right but is subtly misspelled.'],
    vi: ['Tên miền giả gần giống', 'Địa chỉ web trông gần đúng nhưng bị viết sai một chút.'],
  },
  [SignalCode.SENDER_MISMATCH]: {
    en: ['Sender mismatch', 'The display name and the real email address do not match.'],
    vi: ['Người gửi không khớp', 'Tên hiển thị và địa chỉ email thật không khớp nhau.'],
  },
  [SignalCode.HIDDEN_LINK]: {
    en: ['Hidden link target', 'The link text shows one address but points somewhere else.'],
    vi: ['Link ẩn khác chữ hiển thị', 'Chữ của link ghi một nơi nhưng thực tế trỏ nơi khác.'],
  },
  [SignalCode.URGENCY]: {
    en: ['False urgency', 'Pressures you to act immediately or threatens a penalty.'],
    vi: ['Tạo cảm giác khẩn cấp', 'Thúc bạn làm ngay hoặc doạ phạt/khoá tài khoản.'],
  },
  [SignalCode.SENSITIVE_REQUEST]: {
    en: ['Asks for secrets', 'Requests an OTP, password, card number or ID.'],
    vi: ['Đòi thông tin nhạy cảm', 'Xin mã OTP, mật khẩu, số thẻ hoặc giấy tờ tuỳ thân.'],
  },
  [SignalCode.SUSPICIOUS_ATTACHMENT]: {
    en: ['Suspicious attachment', 'An unexpected file you are pushed to open.'],
    vi: ['File đính kèm lạ', 'File bất ngờ mà bạn bị thúc mở.'],
  },
  [SignalCode.GENERIC_GREETING]: {
    en: ['Generic greeting', 'Addresses you as "dear customer" instead of your name.'],
    vi: ['Lời chào chung chung', 'Xưng "quý khách" thay vì tên thật của bạn.'],
  },
  [SignalCode.SPELLING_ERRORS]: {
    en: ['Spelling errors', 'Clumsy wording or machine-translated text.'],
    vi: ['Sai chính tả, dịch máy', 'Câu chữ lủng củng hoặc như dịch máy.'],
  },
  [SignalCode.TOO_GOOD]: {
    en: ['Too good to be true', 'Prize, refund or free gift you never signed up for.'],
    vi: ['Quá tốt để là thật', 'Trúng thưởng, hoàn tiền hay quà miễn phí không rõ lý do.'],
  },
  [SignalCode.OFF_CHANNEL]: {
    en: ['Off-channel contact', 'Pushes you to a private chat instead of official channels.'],
    vi: ['Kênh liên hệ lạ', 'Dẫn bạn sang chat riêng thay vì kênh chính thức.'],
  },
  [SignalCode.MISSING_DETAILS]: {
    en: ['Missing specifics', 'A real notice would name your order, account or case — this one is vague.'],
    vi: ['Thiếu thông tin cụ thể', 'Thông báo thật sẽ nêu mã đơn, số tài khoản hay vụ việc — cái này thì chung chung.'],
  },
  [SignalCode.UNTRUSTED_APP]: {
    en: ['Untrusted app', 'Installs outside the official store or asks for excessive permissions (accessibility).'],
    vi: ['Ứng dụng không đáng tin', 'Cài ngoài cửa hàng chính thức hoặc xin quyền quá mức (trợ năng).'],
  },
  [SignalCode.PAYMENT_CHANGE]: {
    en: ['Payment details changed', 'A sudden switch to a new account for payments — confirm on a number you already know before paying.'],
    vi: ['Đổi thông tin thanh toán', 'Bất ngờ báo đổi số tài khoản nhận tiền — hãy gọi số quen để xác nhận trước khi chuyển.'],
  },
};

// ─── Categories — bilingual ───
const CATEGORIES: {
  code: string;
  impersonates: string[];
  en: [string, string];
  vi: [string, string];
}[] = [
  {
    code: CategoryCode.BANK,
    impersonates: ['Generic Bank'],
    en: ['Bank', 'Messages pretending to be from your bank.'],
    vi: ['Ngân hàng', 'Tin nhắn giả danh ngân hàng của bạn.'],
  },
  {
    code: CategoryCode.SHIP,
    impersonates: ['Generic Courier'],
    en: ['Delivery', 'Fake parcel or shipping notifications.'],
    vi: ['Giao hàng', 'Thông báo bưu kiện/giao hàng giả.'],
  },
  {
    code: CategoryCode.SUBSCR,
    impersonates: ['Generic Streaming Service'],
    en: ['Digital subscription', 'Fake billing or account alerts from online services.'],
    vi: ['Dịch vụ số', 'Cảnh báo thanh toán/tài khoản giả từ dịch vụ online.'],
  },
  {
    code: CategoryCode.ECOM,
    impersonates: ['ChợXanh'],
    en: ['Marketplace', 'Fake vouchers, prizes or order problems from shopping sites.'],
    vi: ['Sàn TMĐT', 'Voucher, trúng thưởng hay lỗi đơn giả từ sàn mua sắm.'],
  },
  {
    code: CategoryCode.TELCO,
    impersonates: ['TelNet'],
    en: ['Mobile carrier', 'Fake SIM, data or account messages from your carrier.'],
    vi: ['Nhà mạng', 'Tin nhắn SIM, data hay tài khoản giả từ nhà mạng.'],
  },
  {
    code: CategoryCode.SOCIAL,
    impersonates: ['A friend or relative'],
    en: ['Someone you know', 'A contact asking for money or a favour — possibly hacked.'],
    vi: ['Người quen', 'Người quen nhờ chuyển tiền hay giúp việc gì đó — có thể đã bị chiếm tài khoản.'],
  },
  {
    code: CategoryCode.ACC,
    impersonates: ['Cloudbox Mail', 'Cloudbox Drive'],
    en: ['Account & storage', 'Fake sign-in or sharing alerts for your email or cloud drive.'],
    vi: ['Tài khoản & lưu trữ', 'Cảnh báo đăng nhập/chia sẻ giả cho email hoặc kho lưu trữ đám mây.'],
  },
  {
    code: CategoryCode.EDU,
    impersonates: ['A scholarship programme'],
    en: ['Study & scholarships', 'Fake scholarships or student-account notices.'],
    vi: ['Học tập & học bổng', 'Học bổng giả hoặc thông báo tài khoản sinh viên giả.'],
  },
];

// ─── Brand handbook — REAL channels of the (fictional) brands used in quizzes ───
// One set per locale: VI quizzes use vi brands, EN quizzes use en brands.
// Must match the quizzes: safe ones use the handbook channels, scams deviate from them.
// Hotline numbers deliberately DIFFER from the scam numbers in the bank emails ("1900 6060" / "1-888-606-0606").
const BRANDS: {
  locale: 'en' | 'vi';
  code: string;
  name: string;
  categoryCode: string;
  description: string;
  websites?: string[];
  emailDomains?: string[];
  smsSenders?: string[];
  hotlines?: string[];
  apps?: string[];
  socialPages?: string[];
}[] = [
  // ── vi ──
  {
    locale: 'vi',
    code: 'SAOMAI_BANK',
    name: 'Sao Mai Bank',
    categoryCode: CategoryCode.BANK,
    description: 'Ngân hàng bán lẻ. Không bao giờ hỏi mật khẩu hay mã OTP qua email, SMS hoặc điện thoại.',
    websites: ['saomaibank.vn'],
    emailDomains: ['saomaibank.vn'],
    smsSenders: ['SAOMAIBANK'],
    hotlines: ['1800 555 010'],
    apps: ['Sao Mai Mobile — Sao Mai Bank JSC'],
    socialPages: ['facebook.com/saomaibank'],
  },
  {
    locale: 'vi',
    code: 'CHOXANH',
    name: 'ChợXanh',
    categoryCode: CategoryCode.ECOM,
    description: 'Sàn mua sắm online. Voucher chỉ có trong app hoặc website ChợXanh.',
    websites: ['choxanh.vn'],
    emailDomains: ['choxanh.vn'],
    smsSenders: ['CHOXANH'],
    hotlines: ['1800 555 020'],
    apps: ['ChợXanh — ChợXanh JSC'],
    socialPages: ['facebook.com/choxanh.vn'],
  },
  {
    locale: 'vi',
    code: 'TELNET',
    name: 'TelNet',
    categoryCode: CategoryCode.TELCO,
    description:
      'Nhà mạng di động. Xác thực SIM làm trong app My TelNet hoặc tại cửa hàng TelNet — không qua link. Kẻ gian có thể giả tên người gửi, nên hãy soi cả đường link.',
    websites: ['telnet.vn'],
    emailDomains: ['telnet.vn'],
    smsSenders: ['TelNet'],
    hotlines: ['1800 555 030'],
    apps: ['My TelNet — TelNet Telecom'],
    socialPages: ['facebook.com/telnet.vn'],
  },
  {
    locale: 'vi',
    code: 'CLOUDBOX',
    name: 'Cloudbox',
    categoryCode: CategoryCode.ACC,
    description: 'Email và lưu trữ đám mây. Trang đăng nhập chỉ nằm trên cloudbox.com.',
    websites: ['cloudbox.com'],
    emailDomains: ['cloudbox.com'],
    apps: ['Cloudbox Mail — Cloudbox Inc.', 'Cloudbox Drive — Cloudbox Inc.'],
  },
  {
    locale: 'vi',
    code: 'PAYNHANH',
    name: 'PayNhanh',
    categoryCode: CategoryCode.WALLET,
    description: 'Ví điện tử. Mã QR thanh toán mở trong app PayNhanh và hiện paynhanh.vn.',
    websites: ['paynhanh.vn'],
    emailDomains: ['paynhanh.vn'],
    smsSenders: ['PAYNHANH'],
    hotlines: ['1800 555 040'],
    apps: ['PayNhanh — PayNhanh JSC'],
  },
  // ── en ──
  {
    locale: 'en',
    code: 'NORTHSTAR_BANK',
    name: 'Northstar Bank',
    categoryCode: CategoryCode.BANK,
    description: 'Retail bank. Never asks for your password or one-time code by email, text or phone.',
    websites: ['northstarbank.com'],
    emailDomains: ['northstarbank.com'],
    smsSenders: ['NORTHSTAR'],
    hotlines: ['1-800-555-0110'],
    apps: ['Northstar Mobile — Northstar Bank plc'],
    socialPages: ['facebook.com/northstarbank'],
  },
  {
    locale: 'en',
    code: 'GREENMART',
    name: 'GreenMart',
    categoryCode: CategoryCode.ECOM,
    description: 'Online marketplace. Vouchers only appear inside the GreenMart app or website.',
    websites: ['greenmart.com'],
    emailDomains: ['greenmart.com'],
    smsSenders: ['GREENMART'],
    hotlines: ['1-800-555-0120'],
    apps: ['GreenMart — GreenMart Inc.'],
    socialPages: ['facebook.com/greenmart'],
  },
  {
    locale: 'en',
    code: 'SKYLINE_MOBILE',
    name: 'Skyline Mobile',
    categoryCode: CategoryCode.TELCO,
    description:
      'Mobile carrier. SIM checks happen in the My Skyline app or in a Skyline store — never through a link. Scammers can fake the sender name, so check the link too.',
    websites: ['skylinemobile.com'],
    emailDomains: ['skylinemobile.com'],
    smsSenders: ['Skyline'],
    hotlines: ['1-800-555-0130'],
    apps: ['My Skyline — Skyline Mobile'],
    socialPages: ['facebook.com/skylinemobile'],
  },
  {
    locale: 'en',
    code: 'CLOUDBOX',
    name: 'Cloudbox',
    categoryCode: CategoryCode.ACC,
    description: 'Email and cloud storage. Sign-in pages are only on cloudbox.com.',
    websites: ['cloudbox.com'],
    emailDomains: ['cloudbox.com'],
    apps: ['Cloudbox Mail — Cloudbox Inc.', 'Cloudbox Drive — Cloudbox Inc.'],
  },
  {
    locale: 'en',
    code: 'QUICKPAY',
    name: 'QuickPay',
    categoryCode: CategoryCode.WALLET,
    description: 'Digital wallet. Payment QR codes open inside the QuickPay app and show quickpay.com.',
    websites: ['quickpay.com'],
    emailDomains: ['quickpay.com'],
    smsSenders: ['QUICKPAY'],
    hotlines: ['1-800-555-0140'],
    apps: ['QuickPay — QuickPay Inc.'],
  },
];

async function clearCatalog() {
  // Delete in FK order.
  await prisma.brand.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.quizQuestionSignal.deleteMany();
  await prisma.quizQuestionTranslation.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.variantSignal.deleteMany();
  await prisma.variantTranslation.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.templateTranslation.deleteMany();
  await prisma.template.deleteMany();
  await prisma.categoryTranslation.deleteMany();
  await prisma.category.deleteMany();
  await prisma.signalTranslation.deleteMany();
  await prisma.signal.deleteMany();
}

/** Hotspot + shell structure rules shared with the admin API (packages/shared/scenario-rules). */
function assertHotspots(args: {
  kind: string;
  isScam: boolean;
  order: number;
  signalCodes: string[];
  en: { scenarioData: unknown };
  vi: { scenarioData: unknown };
}) {
  for (const locale of ['en', 'vi'] as const) {
    const errors = [
      ...checkScenarioShape(args.kind, args[locale].scenarioData),
      ...checkQuizHotspots({ isScam: args.isScam, signalCodes: args.signalCodes, scenarioData: args[locale].scenarioData }),
    ];
    if (errors.length) throw new Error(`quiz #${args.order} (${locale}): ${errors.join('; ')}`);
  }
}

async function main() {
  console.log('Seeding catalog...');
  await clearCatalog();

  // Signals
  const signalIdByCode: Record<string, string> = {};
  for (const [code, i18n] of Object.entries(SIGNAL_I18N)) {
    const signal = await prisma.signal.create({
      data: {
        code,
        translations: {
          create: [
            { locale: 'en', name: i18n.en[0], explanation: i18n.en[1] },
            { locale: 'vi', name: i18n.vi[0], explanation: i18n.vi[1] },
          ],
        },
      },
    });
    signalIdByCode[code] = signal.id;
  }

  // Categories
  const categoryIdByCode: Record<string, string> = {};
  for (const [i, c] of [...CATEGORIES, ...EXTRA_CATEGORIES].entries()) {
    const cat = await prisma.category.create({
      data: {
        code: c.code,
        impersonates: c.impersonates,
        order: i,
        translations: {
          create: [
            { locale: 'en', name: c.en[0], description: c.en[1] },
            { locale: 'vi', name: c.vi[0], description: c.vi[1] },
          ],
        },
      },
    });
    categoryIdByCode[c.code] = cat.id;
  }

  // Brand handbook
  for (const [i, b] of [...BRANDS, ...EXTRA_BRANDS].entries()) {
    const { categoryCode, ...rest } = b;
    await prisma.brand.create({
      data: { ...rest, categoryId: categoryIdByCode[categoryCode] ?? null, order: i },
    });
  }


  // Template BANK-001 + 1 variant
  const bankTemplate = await prisma.template.create({
    data: {
      code: 'BANK-001',
      categoryId: categoryIdByCode[CategoryCode.BANK],
      translations: {
        create: [
          {
            locale: 'en',
            subjectPattern: '[{bank}] Your account will be locked',
            bodyPattern: 'We detected unusual activity. Verify within 24h to avoid a lock.',
          },
          {
            locale: 'vi',
            subjectPattern: '[{bank}] Tài khoản của bạn sắp bị khoá',
            bodyPattern: 'Chúng tôi phát hiện hoạt động bất thường. Xác minh trong 24h để tránh bị khoá.',
          },
        ],
      },
    },
  });

  const bankVariant = await prisma.variant.create({
    data: {
      templateId: bankTemplate.id,
      difficultyLevel: 1,
      translations: {
        create: [
          {
            locale: 'en',
            renderedSubject: '[SecureBank] Your account will be locked in 24 hours',
            renderedBody:
              'Dear customer, unusual activity was detected. Confirm your details at secure-bank-verify.example to avoid suspension.',
          },
          {
            locale: 'vi',
            renderedSubject: '[SecureBank] Tài khoản của bạn sẽ bị khoá trong 24 giờ',
            renderedBody:
              'Kính gửi quý khách, phát hiện hoạt động bất thường. Vui lòng xác nhận thông tin tại secure-bank-verify.example để tránh bị tạm khoá.',
          },
        ],
      },
      signals: {
        create: [
          { signalId: signalIdByCode[SignalCode.URGENCY] },
          { signalId: signalIdByCode[SignalCode.LOOKALIKE_DOMAIN] },
          { signalId: signalIdByCode[SignalCode.GENERIC_GREETING] },
        ],
      },
    },
  });

  // Template SHIP-001 + 1 variant
  const shipTemplate = await prisma.template.create({
    data: {
      code: 'SHIP-001',
      categoryId: categoryIdByCode[CategoryCode.SHIP],
      translations: {
        create: [
          {
            locale: 'en',
            subjectPattern: '[{courier}] Parcel held — pay a small fee',
            bodyPattern: 'Your parcel is on hold. Pay a redelivery fee to release it.',
          },
          {
            locale: 'vi',
            subjectPattern: '[{courier}] Bưu kiện bị giữ — đóng phí nhỏ',
            bodyPattern: 'Bưu kiện của bạn đang bị giữ. Đóng phí giao lại để nhận hàng.',
          },
        ],
      },
    },
  });

  await prisma.variant.create({
    data: {
      templateId: shipTemplate.id,
      difficultyLevel: 2,
      translations: {
        create: [
          {
            locale: 'en',
            renderedSubject: 'Your parcel is waiting — small customs fee required',
            renderedBody:
              'We could not deliver your parcel. Pay the redelivery fee at track-parcel-pay.example.',
          },
          {
            locale: 'vi',
            renderedSubject: 'Bưu kiện của bạn đang chờ — cần đóng phí hải quan nhỏ',
            renderedBody:
              'Chúng tôi không giao được bưu kiện. Đóng phí giao lại tại track-parcel-pay.example.',
          },
        ],
      },
      signals: {
        create: [
          { signalId: signalIdByCode[SignalCode.HIDDEN_LINK] },
          { signalId: signalIdByCode[SignalCode.URGENCY] },
        ],
      },
    },
  });

  // ─── On-site simulated quizzes (Training part b) ───
  // `scenarioData` is REQUIRED: every quiz needs a simulated shell (R10) with hotspots for
  // in-place inspection. CORRECT hotspot = answer signal; DECOY hotspot = any other signal.
  // `title`: neutral library title — must NOT reveal the answer.
  type QText = { title: string; prompt: string; scenario: string; explanation: string; scenarioData: ScenarioData };
  type QuizArgs = {
    kind: string;
    isScam: boolean;
    isPublic: boolean;
    order: number;
    /** 1 = easy, 2 = medium, 3 = hard. Missing → from RERATE, default 1. */
    difficulty?: number;
    categoryCode?: string;
    signalCodes: string[];
    en: QText;
    vi: QText;
  };
  const makeQuiz = (args: QuizArgs) => {
    assertHotspots(args);
    return prisma.quizQuestion.create({
      data: {
        kind: args.kind as never,
        isScam: args.isScam,
        isPublic: args.isPublic,
        order: args.order,
        difficultyLevel: args.difficulty ?? RERATE[args.order] ?? 1,
        categoryId: args.categoryCode ? categoryIdByCode[args.categoryCode] : null,
        translations: {
          create: [
            { locale: 'en', ...args.en, scenarioData: args.en.scenarioData as never },
            { locale: 'vi', ...args.vi, scenarioData: args.vi.scenarioData as never },
          ],
        },
        signals: { create: args.signalCodes.map((c) => ({ signalId: signalIdByCode[c] })) },
      },
    });
  };

  // Scam WEB: fake bank login page — the lookalike domain is the main sign.
  await makeQuiz({
    kind: QuizKind.WEB_INSPECTION,
    isScam: true,
    isPublic: true,
    order: 1,
    categoryCode: CategoryCode.BANK,
    signalCodes: [SignalCode.LOOKALIKE_DOMAIN],
    en: {
      prompt: 'Safe or scam? You were sent a link to log in to your bank.',
      title: 'Northstar Bank login page',
      scenario: 'A Northstar Bank login page opened from a link.',
      explanation:
        'The page looks right, but the address is a look-alike — not the bank’s real website northstarbank.com.',
      scenarioData: {
        urlBar: { text: 'https://northstarbank-secure-login.com/ebank', signal: SignalCode.LOOKALIKE_DOMAIN },
        title: 'Northstar Bank — Online Banking',
        body: [
          'Personal · Business · Cards · Loans · Help',
          'Log in to manage your accounts, cards and transfers.',
          'Username: ____________\nPassword: ____________\n☐ Remember my username',
          { text: 'For your security, never share your OTP with anyone.', signal: SignalCode.SENSITIVE_REQUEST, note: 'Real bank login pages show this exact reminder — it warns you and asks for nothing. The clone copied it to look genuine; the address bar is what gives it away.' },
          'New to Online Banking? Register with your card number in a few minutes.',
          '© 2026 Northstar Bank. Member FDIC · Privacy · Terms of use',
        ],
        buttons: ['Log in', 'Forgot password?'],
      },
    },
    vi: {
      prompt: 'An toàn hay lừa đảo? Bạn được gửi một link để đăng nhập ngân hàng.',
      title: 'Trang đăng nhập Sao Mai Bank',
      scenario: 'Trang đăng nhập Sao Mai Bank mở ra từ một đường link.',
      explanation: 'Trang trông giống thật, nhưng địa chỉ là hàng nhái — không phải website thật saomaibank.vn.',
      scenarioData: {
        urlBar: { text: 'https://saomaibank-secure-login.com/ebank', signal: SignalCode.LOOKALIKE_DOMAIN },
        title: 'Sao Mai Bank — Ngân hàng điện tử',
        body: [
          'Cá nhân · Doanh nghiệp · Thẻ · Vay · Hỗ trợ',
          'Đăng nhập để quản lý tài khoản, thẻ và chuyển khoản.',
          'Tên đăng nhập: ____________\nMật khẩu: ____________\n☐ Ghi nhớ tên đăng nhập',
          { text: 'Vì an toàn của bạn, không chia sẻ mã OTP cho bất kỳ ai.', signal: SignalCode.SENSITIVE_REQUEST, note: 'Trang đăng nhập ngân hàng thật vẫn có câu nhắc này — nó cảnh báo bạn chứ không xin gì. Trang giả chép lại cho giống thật; chỗ lộ ra là thanh địa chỉ.' },
          'Chưa có tài khoản? Đăng ký bằng số thẻ chỉ trong vài phút.',
          '© 2026 Sao Mai Bank · Chính sách bảo mật · Điều khoản sử dụng',
        ],
        buttons: ['Đăng nhập', 'Quên mật khẩu?'],
      },
    },
  });

  // Scam EMAIL: near-perfect lookalike domain + link text that hides where it really goes.
  await makeQuiz({
    kind: QuizKind.EMAIL_INSPECTION,
    isScam: true,
    isPublic: true,
    order: 2,
    categoryCode: CategoryCode.BANK,
    signalCodes: [SignalCode.URGENCY, SignalCode.GENERIC_GREETING, SignalCode.LOOKALIKE_DOMAIN, SignalCode.HIDDEN_LINK],
    en: {
      prompt: 'Safe or scam? Read this email, then tap anything suspicious.',
      title: 'Account confirmation email',
      scenario: 'An email saying your account will be closed in 24 hours.',
      explanation:
        'The sender is northstarbank-online.com, not northstarbank.com, and the link shows the real site but goes to the look-alike. A generic greeting + a 24-hour threat are classic pressure tactics.',
      scenarioData: {
        senderName: { text: 'Account Services', signal: SignalCode.SENDER_MISMATCH, note: 'Real bank emails often use a department name as the sender name. The name proves nothing either way — the address next to it is what to check.' },
        senderAddress: { text: 'service@northstarbank-online.com', signal: SignalCode.LOOKALIKE_DOMAIN },
        to: 'me',
        time: '07:45',
        subject: 'Action required: confirm your account',
        body: [
          { text: 'Dear customer,', signal: SignalCode.GENERIC_GREETING },
          'As part of our regular account review, we were unable to confirm some of the information on your profile.',
          'To comply with banking regulations, every account must be confirmed at least once a year. Until this is done, some services such as transfers and card payments may be limited.',
          { text: 'Your account will be closed in 24 hours unless you confirm now.', signal: SignalCode.URGENCY },
          'Confirming only takes a few minutes. Please have your account number, card details and registered phone number ready.',
          {
            text: 'Confirm your account: northstarbank.com/confirm',
            signal: SignalCode.HIDDEN_LINK,
            href: 'https://northstarbank-online.com/confirm',
          },
          { text: 'If you have already confirmed your account, you can ignore this message.', signal: SignalCode.SPELLING_ERRORS, note: 'An “ignore this if you’ve already done it” line is standard in genuine reminders and asks nothing of you.' },
          'Thank you for banking with us.',
          { text: 'Account Services Team', signal: SignalCode.MISSING_DETAILS, note: 'Signing off with a team name instead of a person is normal for automated bank emails.' },
        ],
      },
    },
    vi: {
      prompt: 'An toàn hay lừa đảo? Đọc email này rồi chạm vào chỗ đáng ngờ.',
      title: 'Email yêu cầu xác nhận tài khoản',
      scenario: 'Email báo tài khoản sẽ bị đóng trong 24 giờ.',
      explanation:
        'Người gửi là saomaibank-vn.com chứ không phải saomaibank.vn, còn link ghi trang thật nhưng trỏ sang trang nhái. Lời chào chung chung + doạ đóng tài khoản trong 24 giờ là chiêu gây áp lực điển hình.',
      scenarioData: {
        senderName: { text: 'Dịch vụ tài khoản', signal: SignalCode.SENDER_MISMATCH, note: 'Ngân hàng thật vẫn để tên hiển thị là tên bộ phận. Tên hiển thị không nói lên gì — phải xem địa chỉ email bên cạnh.' },
        senderAddress: { text: 'service@saomaibank-vn.com', signal: SignalCode.LOOKALIKE_DOMAIN },
        to: 'tôi',
        time: '07:45',
        subject: 'Yêu cầu xác nhận tài khoản',
        body: [
          { text: 'Kính gửi quý khách,', signal: SignalCode.GENERIC_GREETING },
          'Trong đợt rà soát tài khoản định kỳ, chúng tôi chưa xác nhận được một số thông tin trong hồ sơ của quý khách.',
          'Theo quy định, mỗi tài khoản cần được xác nhận ít nhất một lần mỗi năm. Trong thời gian chờ, một số dịch vụ như chuyển khoản và thanh toán thẻ có thể bị hạn chế.',
          { text: 'Tài khoản của bạn sẽ bị đóng trong 24 giờ nếu không xác nhận ngay.', signal: SignalCode.URGENCY },
          'Việc xác nhận chỉ mất vài phút. Quý khách vui lòng chuẩn bị số tài khoản, thông tin thẻ và số điện thoại đã đăng ký.',
          {
            text: 'Xác nhận tài khoản: saomaibank.vn/xac-nhan',
            signal: SignalCode.HIDDEN_LINK,
            href: 'https://saomaibank-vn.com/xac-nhan',
          },
          { text: 'Nếu quý khách đã xác nhận, vui lòng bỏ qua email này.', signal: SignalCode.SPELLING_ERRORS, note: 'Câu "đã làm rồi thì bỏ qua" là câu chuẩn trong email nhắc việc thật và không đòi bạn làm gì.' },
          'Cảm ơn quý khách đã sử dụng dịch vụ.',
          { text: 'Bộ phận Dịch vụ Tài khoản', signal: SignalCode.MISSING_DETAILS, note: 'Ký tên bằng bộ phận thay vì tên người là chuyện bình thường ở email tự động của ngân hàng.' },
        ],
      },
    },
  });

  // APP consent phishing: a game asks to read email, contacts, and send mail as you.
  await makeQuiz({
    kind: QuizKind.OAUTH_CONSENT,
    isScam: true,
    isPublic: false, // signed-in users only
    order: 4,
    categoryCode: CategoryCode.ACC,
    signalCodes: [SignalCode.SENSITIVE_REQUEST, SignalCode.UNTRUSTED_APP],
    en: {
      prompt: 'Safe or scam? A game asks for these permissions, then tap anything suspicious.',
      title: 'Puzzle game asks for account access',
      scenario: 'A puzzle game asks to access your account.',
      explanation:
        'A game has no reason to read your email or download your contacts — the permissions far exceed what it needs.',
      scenarioData: {
        appName: { text: 'Puzzle Quest Free', signal: SignalCode.TOO_GOOD, note: 'A free game with a catchy name is completely ordinary — the problem is the permissions it asks for, not its name.' },
        publisher: { text: 'Fun Games Studio', signal: SignalCode.MISSING_DETAILS, note: 'Small studios with generic names are everywhere in app stores; the publisher name alone isn’t a warning sign.' },
        permissions: [
          { text: 'Read, compose and send emails from your account', signal: SignalCode.SENSITIVE_REQUEST },
          { text: 'See and download all your contacts', signal: SignalCode.UNTRUSTED_APP },
          'See your name and profile picture',
        ],
      },
    },
    vi: {
      prompt: 'An toàn hay lừa đảo? Một game xin các quyền này, rồi chạm vào chỗ đáng ngờ.',
      title: 'Game xếp hình xin quyền tài khoản',
      scenario: 'Một game xếp hình xin truy cập tài khoản của bạn.',
      explanation: 'Game không có lý do gì để đọc email hay tải danh bạ của bạn — quyền xin vượt xa nhu cầu.',
      scenarioData: {
        appName: { text: 'Puzzle Quest Free', signal: SignalCode.TOO_GOOD, note: 'Game miễn phí đặt tên bắt tai là chuyện thường — vấn đề nằm ở các quyền nó xin, không phải ở cái tên.' },
        publisher: { text: 'Fun Games Studio', signal: SignalCode.MISSING_DETAILS, note: 'Studio game nhỏ với tên chung chung có đầy trên kho ứng dụng; riêng tên nhà phát hành chưa phải dấu hiệu.' },
        permissions: [
          { text: 'Đọc, soạn và gửi email từ tài khoản của bạn', signal: SignalCode.SENSITIVE_REQUEST },
          { text: 'Xem và tải xuống toàn bộ danh bạ', signal: SignalCode.UNTRUSTED_APP },
          'Xem tên và ảnh đại diện của bạn',
        ],
      },
    },
  });

  // ─── HOTSPOT quizzes (in-place inspection) — one simulated shell per channel ───

  // Scam EMAIL: lookalike domain + urgency + generic greeting + fake attachment.
  await makeQuiz({
    kind: QuizKind.EMAIL_INSPECTION,
    isScam: true,
    isPublic: true,
    order: 5,
    categoryCode: CategoryCode.BANK,
    signalCodes: [
      SignalCode.LOOKALIKE_DOMAIN,
      SignalCode.URGENCY,
      SignalCode.GENERIC_GREETING,
      SignalCode.SUSPICIOUS_ATTACHMENT,
      SignalCode.OFF_CHANNEL,
    ],
    en: {
      prompt: 'Safe or scam? Inspect this email, then tap anything suspicious.',
      title: 'Northstar Bank email with an attachment',
      scenario: 'Northstar Bank email about a flagged payment, with an attached file.',
      explanation:
        'The sender domain is a look-alike, the deadline is pressure, the greeting is generic, an .html attachment that asks you to sign in is a fake login page, and the hotline isn’t the bank’s real number (see the handbook).',
      scenarioData: {
        senderName: { text: 'Northstar Bank', signal: SignalCode.SENDER_MISMATCH, note: 'Every bank email shows the bank’s name as the sender. Anyone can type it, so it is neither a warning nor proof — check the address instead.' },
        senderAddress: { text: 'no-reply@northstar-bank-secure.xyz', signal: SignalCode.LOOKALIKE_DOMAIN },
        to: 'me',
        time: '09:12',
        subject: { text: 'Your account will be locked within 24 hours', signal: SignalCode.URGENCY },
        body: [
          { text: 'Dear customer,', signal: SignalCode.GENERIC_GREETING },
          'We detected unusual activity. Confirm your details now to avoid suspension.',
          'Our system flagged a payment of $1,840.00 to an overseas merchant that does not match your usual spending. As a precaution, outgoing transfers on your account have been paused.',
          'The attached file shows the details of the flagged transaction. Please open it, check the amount and sign in to Online Banking to confirm whether you made this payment.',
          'If we do not hear from you within 24 hours, your account will be locked and your cards will be blocked to protect your funds.',
          { text: 'Reference: NS-2410-0912', signal: SignalCode.MISSING_DETAILS, note: 'Banks add a reference number to fraud alerts so you can quote it when you call. Having one is normal.' },
          'Kind regards,\nFraud Prevention Team',
          { text: 'Northstar Bank hotline: 1-888-606-0606', signal: SignalCode.OFF_CHANNEL },
          { text: 'This email was sent to you as a Northstar Bank customer.', signal: SignalCode.SPELLING_ERRORS, note: 'Standard footer text found in genuine bank emails — it asks nothing of you.' },
        ],
        attachments: [
          { name: 'Transaction_NS24100912.html', size: '12 KB', signal: SignalCode.SUSPICIOUS_ATTACHMENT },
        ],
      },
    },
    vi: {
      prompt: 'An toàn hay lừa đảo? Soi email này rồi chạm vào chỗ đáng ngờ.',
      title: 'Email Sao Mai Bank kèm tệp đính kèm',
      scenario: 'Email Sao Mai Bank báo giao dịch bị nghi ngờ, kèm một tệp đính kèm.',
      explanation:
        'Domain người gửi là hàng nhái, thời hạn gây áp lực, lời chào chung chung, tệp .html bắt đăng nhập chính là trang đăng nhập giả, và số tổng đài không phải số thật của ngân hàng (xem sổ tay).',
      scenarioData: {
        senderName: { text: 'Sao Mai Bank', signal: SignalCode.SENDER_MISMATCH, note: 'Email ngân hàng nào cũng hiện tên ngân hàng ở người gửi. Ai cũng gõ được tên này, nên nó không phải dấu hiệu cũng không phải bằng chứng — hãy xem địa chỉ email.' },
        senderAddress: { text: 'no-reply@saomai-bank-secure.xyz', signal: SignalCode.LOOKALIKE_DOMAIN },
        to: 'tôi',
        time: '09:12',
        subject: { text: 'Tài khoản của bạn sẽ bị khoá trong 24 giờ', signal: SignalCode.URGENCY },
        body: [
          { text: 'Kính gửi quý khách,', signal: SignalCode.GENERIC_GREETING },
          'Chúng tôi phát hiện hoạt động bất thường. Hãy xác nhận thông tin ngay để tránh bị tạm khoá.',
          'Hệ thống ghi nhận giao dịch 45.800.000đ tới một đơn vị nước ngoài, không khớp thói quen chi tiêu của quý khách. Để phòng ngừa, chức năng chuyển tiền đi đã tạm dừng.',
          'Tệp đính kèm ghi chi tiết giao dịch bị nghi ngờ. Quý khách vui lòng mở tệp, kiểm tra số tiền và đăng nhập Ngân hàng điện tử để xác nhận có thực hiện giao dịch này hay không.',
          'Nếu không nhận được phản hồi trong 24 giờ, tài khoản sẽ bị khoá và thẻ bị chặn để bảo vệ tiền của quý khách.',
          { text: 'Mã tham chiếu: SM-2410-0912', signal: SignalCode.MISSING_DETAILS, note: 'Ngân hàng hay kèm mã tham chiếu trong cảnh báo giao dịch để bạn đọc khi gọi tổng đài. Có mã là bình thường.' },
          'Trân trọng,\nBộ phận Phòng chống Gian lận',
          { text: 'Tổng đài Sao Mai Bank: 1900 6060', signal: SignalCode.OFF_CHANNEL },
          { text: 'Email này được gửi tới bạn với tư cách khách hàng của Sao Mai Bank.', signal: SignalCode.SPELLING_ERRORS, note: 'Câu chân trang chuẩn trong email ngân hàng thật, không đòi hỏi gì ở bạn.' },
        ],
        attachments: [
          { name: 'ChiTietGiaoDich_SM24100912.html', size: '12 KB', signal: SignalCode.SUSPICIOUS_ATTACHMENT },
        ],
      },
    },
  });

  // SAFE EMAIL (R11) — real domain, no urgency. Decoy: tapping the real domain = false alarm.
  await makeQuiz({
    kind: QuizKind.EMAIL_INSPECTION,
    isScam: false,
    isPublic: true,
    order: 6,
    categoryCode: CategoryCode.BANK,
    signalCodes: [],
    en: {
      prompt: 'Safe or scam? Inspect this email.',
      title: 'Northstar Bank monthly statement',
      scenario: 'Northstar Bank monthly statement notice from the official domain.',
      explanation:
        'This is legitimate: the real domain northstarbank.com, no pressure, and it points you to the official app — nothing to report.',
      scenarioData: {
        senderName: { text: 'Northstar Bank', signal: SignalCode.SENDER_MISMATCH, note: 'The sender name matches the address statements@northstarbank.com — exactly as it should.' },
        senderAddress: { text: 'statements@northstarbank.com', signal: SignalCode.LOOKALIKE_DOMAIN, note: 'This is the bank’s real domain northstarbank.com (see the handbook), not a look-alike.' },
        to: 'me',
        time: '08:03',
        subject: 'Your monthly statement is ready',
        body: [
          'Hello,',
          'Your statement for this month is available. Open the Northstar Bank app to view it — we never ask for your password by email.',
          'Account: Everyday Checking ending in 3307\nStatement period: 09/01 – 09/30/2026',
          'To view or download it, open the app and go to Accounts → Statements & documents. Statements are kept for 7 years, so you can find older ones there too.',
          'Prefer paper? You can change how you receive statements in the app under Settings → Paperless preferences.',
          'Spot something you don’t recognise? Call the number on the back of your card.',
          'Northstar Bank\n\nThis is an automated message, please do not reply. Northstar Bank, 200 Harbor Avenue, Seattle, WA. Member FDIC.',
        ],
      },
    },
    vi: {
      prompt: 'An toàn hay lừa đảo? Soi email này.',
      title: 'Sao kê tháng Sao Mai Bank',
      scenario: 'Thông báo sao kê tháng của Sao Mai Bank từ domain chính thức.',
      explanation:
        'Đây là email thật: domain đúng saomaibank.vn, không hối thúc, chỉ hướng bạn mở ứng dụng chính thức — không có gì để báo cáo.',
      scenarioData: {
        senderName: { text: 'Sao Mai Bank', signal: SignalCode.SENDER_MISMATCH, note: 'Tên hiển thị khớp với địa chỉ statements@saomaibank.vn — đúng như phải thế.' },
        senderAddress: { text: 'statements@saomaibank.vn', signal: SignalCode.LOOKALIKE_DOMAIN, note: 'Đây đúng là domain thật saomaibank.vn (xem sổ tay), không phải hàng nhái.' },
        to: 'tôi',
        time: '08:03',
        subject: 'Sao kê tháng của bạn đã sẵn sàng',
        body: [
          'Xin chào,',
          'Sao kê tháng này đã có. Hãy mở ứng dụng Sao Mai Bank để xem — chúng tôi không bao giờ hỏi mật khẩu qua email.',
          'Tài khoản: Thanh toán có số cuối 3307\nKỳ sao kê: 01/09 – 30/09/2026',
          'Để xem hoặc tải về, mở ứng dụng và chọn Tài khoản → Sao kê & chứng từ. Sao kê được lưu 7 năm, bạn có thể tìm các kỳ cũ tại đây.',
          'Muốn nhận sao kê giấy? Bạn có thể đổi cách nhận trong ứng dụng tại Cài đặt → Hình thức nhận sao kê.',
          'Thấy giao dịch lạ? Hãy gọi số tổng đài in ở mặt sau thẻ.',
          'Sao Mai Bank\n\nĐây là email tự động, vui lòng không trả lời. Sao Mai Bank, 25 Lê Lợi, Quận 1, TP.HCM.',
        ],
      },
    },
  });

  // Scam WEB: lookalike domain in the address bar + too-good voucher + urgency.
  await makeQuiz({
    kind: QuizKind.WEB_INSPECTION,
    isScam: true,
    isPublic: true,
    order: 7,
    categoryCode: CategoryCode.ECOM,
    signalCodes: [SignalCode.LOOKALIKE_DOMAIN, SignalCode.TOO_GOOD, SignalCode.URGENCY],
    en: {
      prompt: 'Safe or scam? Look at this page, then tap anything suspicious.',
      title: 'GreenMart voucher page',
      scenario: 'A GreenMart voucher page asking you to claim $25.',
      explanation: 'The address is a look-alike, the reward is too good, and the countdown is fake pressure.',
      scenarioData: {
        urlBar: { text: 'https://greenmart-voucher.com/claim', signal: SignalCode.LOOKALIKE_DOMAIN },
        title: 'Congratulations!',
        body: [
          '🎉 You’ve been selected as one of our lucky shoppers this week!',
          { text: 'You have a $25 voucher waiting — free!', signal: SignalCode.TOO_GOOD },
          'To celebrate our anniversary, GreenMart is giving away 1,000 vouchers to loyal customers. Claim yours in 3 easy steps:\n1. Tap “Claim voucher”\n2. Enter your phone number to verify\n3. Use the code at checkout',
          { text: 'Offer expires in 04:59. Claim now!', signal: SignalCode.URGENCY },
          { text: 'Applies to all GreenMart stores nationwide.', signal: SignalCode.MISSING_DETAILS, note: 'Real vouchers also say where they can be used. This line asks for nothing.' },
          { text: '— GreenMart Customer Care', signal: SignalCode.SENDER_MISMATCH, note: 'Real promo pages sign off as customer care too; the signature isn’t the giveaway, the address bar is.' },
        ],
        buttons: [{ text: 'Claim voucher', signal: SignalCode.HIDDEN_LINK, note: 'Every voucher page has a claim button. The button itself is harmless — what matters is which address the page is on.' }],
      },
    },
    vi: {
      prompt: 'An toàn hay lừa đảo? Nhìn trang này rồi chạm vào chỗ đáng ngờ.',
      title: 'Trang voucher ChợXanh',
      scenario: 'Trang voucher ChợXanh mời bạn nhận 500.000đ.',
      explanation: 'Địa chỉ là hàng nhái, phần thưởng quá hời, đồng hồ đếm ngược là áp lực giả.',
      scenarioData: {
        urlBar: { text: 'https://choxanh-voucher.com/claim', signal: SignalCode.LOOKALIKE_DOMAIN },
        title: 'Chúc mừng!',
        body: [
          '🎉 Bạn là một trong những khách hàng may mắn tuần này!',
          { text: 'Bạn có voucher 500.000đ đang chờ — miễn phí!', signal: SignalCode.TOO_GOOD },
          'Mừng sinh nhật, ChợXanh tặng 1.000 voucher cho khách hàng thân thiết. Nhận ngay chỉ với 3 bước:\n1. Bấm "Nhận voucher"\n2. Nhập số điện thoại để xác minh\n3. Dùng mã khi thanh toán',
          { text: 'Ưu đãi hết hạn sau 04:59. Nhận ngay!', signal: SignalCode.URGENCY },
          { text: 'Áp dụng cho mọi cửa hàng ChợXanh trên toàn quốc.', signal: SignalCode.MISSING_DETAILS, note: 'Voucher thật cũng ghi phạm vi áp dụng. Dòng này không đòi bạn làm gì.' },
          { text: '— Chăm sóc khách hàng ChợXanh', signal: SignalCode.SENDER_MISMATCH, note: 'Trang khuyến mãi thật cũng ký tên CSKH; cái lộ ra là thanh địa chỉ chứ không phải chữ ký.' },
        ],
        buttons: [{ text: 'Nhận voucher', signal: SignalCode.HIDDEN_LINK, note: 'Trang voucher nào cũng có nút nhận. Bản thân nút không sai — quan trọng là trang nằm ở địa chỉ nào.' }],
      },
    },
  });

  // Scam SMS: urgency + lookalike domain link.
  await makeQuiz({
    kind: QuizKind.SMS_INSPECTION,
    isScam: true,
    isPublic: true,
    order: 8,
    categoryCode: CategoryCode.TELCO,
    signalCodes: [SignalCode.URGENCY, SignalCode.LOOKALIKE_DOMAIN],
    en: {
      prompt: 'Safe or scam? Read this SMS, then tap anything suspicious.',
      title: 'Skyline Mobile SIM notice',
      scenario: 'A Skyline Mobile SMS warning your SIM will be locked.',
      explanation: 'A real carrier would not rush you to a look-alike link to avoid a lock.',
      scenarioData: {
        sender: { text: 'Skyline', signal: SignalCode.SENDER_MISMATCH, note: 'Texts from your carrier normally show its brand name. It can be faked, so it doesn’t settle anything — the link does.' },
        messages: [
          { text: 'Your SIM will be locked within 24h.', signal: SignalCode.URGENCY },
          { text: 'Verify now: skyline-verify.xyz/kyc', signal: SignalCode.LOOKALIKE_DOMAIN },
          { text: 'Reply STOP to 9123 to opt out.', signal: SignalCode.MISSING_DETAILS, note: 'Opt-out instructions are standard in carrier texts and don’t ask for any personal data.' },
        ],
      },
    },
    vi: {
      prompt: 'An toàn hay lừa đảo? Đọc tin nhắn này rồi chạm vào chỗ đáng ngờ.',
      title: 'Tin nhắn TelNet về SIM',
      scenario: 'Tin nhắn TelNet cảnh báo SIM sắp bị khoá.',
      explanation: 'Nhà mạng thật không hối bạn vào link nhái để tránh bị khoá.',
      scenarioData: {
        sender: { text: 'TelNet', signal: SignalCode.SENDER_MISMATCH, note: 'Tin nhắn nhà mạng bình thường hiện brandname. Tên này giả được nên không quyết định gì — đường link mới quyết định.' },
        messages: [
          { text: 'Thuê bao của bạn sẽ bị khoá trong 24h.', signal: SignalCode.URGENCY },
          { text: 'Chuẩn hoá ngay: telnet-verify.xyz/kyc', signal: SignalCode.LOOKALIKE_DOMAIN },
          { text: 'Từ chối nhận tin: soạn TC gửi 9123.', signal: SignalCode.MISSING_DETAILS, note: 'Cú pháp từ chối nhận tin là phần chuẩn của tin nhắn nhà mạng, không xin thông tin gì.' },
        ],
      },
    },
  });

  // Scam CHAT: hijacked friend account, urgent money request + avoids calls (off-channel).
  await makeQuiz({
    kind: QuizKind.CHAT_INSPECTION,
    isScam: true,
    isPublic: false,
    order: 9,
    categoryCode: CategoryCode.SOCIAL,
    signalCodes: [SignalCode.URGENCY, SignalCode.OFF_CHANNEL],
    en: {
      prompt: 'Safe or scam? Read this chat, then tap anything suspicious.',
      title: 'A friend asks to borrow money',
      scenario: 'A close friend suddenly asks you to transfer money.',
      explanation:
        'A rush, money to someone else’s account, and an excuse not to talk on the phone — classic account takeover. Call your friend on the number you already have before sending anything.',
      scenarioData: {
        contactName: 'Alex',
        bubbles: [
          { from: 'them', text: { text: 'Hey, you free? 😄', signal: SignalCode.GENERIC_GREETING, note: 'A casual opener is exactly how friends start a chat — nothing odd about the greeting.' } },
          { from: 'them', text: { text: 'Can you lend me $500 right now? It’s urgent.', signal: SignalCode.URGENCY } },
          {
            from: 'them',
            text: 'My banking app is locked, so please send it to my friend’s account: Harbor Bank 0451xxx672 – T. DAVIS.',
          },
          { from: 'them', text: { text: 'I’ll pay you back tomorrow, promise.', signal: SignalCode.TOO_GOOD, note: 'Promising to pay it back is what anyone borrowing money says; on its own it isn’t a red flag.' } },
          { from: 'them', text: { text: 'It’s really loud here, I can’t take calls — just text me.', signal: SignalCode.OFF_CHANNEL } },
          { from: 'me', text: 'Everything ok?' },
        ],
      },
    },
    vi: {
      prompt: 'An toàn hay lừa đảo? Đọc đoạn chat này rồi chạm vào chỗ đáng ngờ.',
      title: 'Bạn thân hỏi mượn tiền',
      scenario: 'Một người bạn thân bỗng nhờ chuyển tiền.',
      explanation:
        'Hối thúc, chuyển vào tài khoản người khác, lại viện cớ không nghe máy — chiêu chiếm tài khoản điển hình. Hãy gọi cho bạn bằng số bạn vẫn có trước khi chuyển tiền.',
      scenarioData: {
        contactName: 'Minh',
        bubbles: [
          { from: 'them', text: { text: 'Ê, đang rảnh không? 😄', signal: SignalCode.GENERIC_GREETING, note: 'Mở đầu bâng quơ đúng kiểu bạn bè nhắn nhau — lời chào không có gì lạ.' } },
          { from: 'them', text: { text: 'Cho mình mượn 5 triệu gấp được không? Đang cần lắm.', signal: SignalCode.URGENCY } },
          {
            from: 'them',
            text: 'App ngân hàng mình đang bị khoá, chuyển giúp vào TK bạn mình nha: Bình An Bank 0451xxx672 – TRAN THI D.',
          },
          { from: 'them', text: { text: 'Mai mình trả lại liền, hứa luôn.', signal: SignalCode.TOO_GOOD, note: 'Hứa trả lại là câu ai đi mượn tiền cũng nói; tự nó không phải dấu hiệu.' } },
          { from: 'them', text: { text: 'Chỗ mình ồn quá không nghe máy được, cứ nhắn ở đây nha.', signal: SignalCode.OFF_CHANNEL } },
          { from: 'me', text: 'Có chuyện gì vậy?' },
        ],
      },
    },
  });

  // Scam APP consent: off-store app asks for accessibility + OTP reading.
  await makeQuiz({
    kind: QuizKind.APP_CONSENT,
    isScam: true,
    isPublic: false,
    order: 10,
    categoryCode: CategoryCode.ACC,
    signalCodes: [SignalCode.UNTRUSTED_APP, SignalCode.SENSITIVE_REQUEST],
    en: {
      prompt: 'Safe or scam? An app asks for these, then tap anything suspicious.',
      title: 'Installing a security helper app',
      scenario: 'A security helper app requests permissions during install.',
      explanation: 'Drawing over other apps and reading your text messages (where OTP codes arrive) far exceed what such an app needs.',
      scenarioData: {
        appName: { text: 'Security Helper+', signal: SignalCode.TOO_GOOD, note: 'Plenty of real utility apps have names like this; the name isn’t the problem — the install source and permissions are.' },
        publisher: { text: 'Play Protect hasn’t seen this app before. It may be harmful to your device.', signal: SignalCode.UNTRUSTED_APP },
        permissions: [
          { text: 'Draw over other apps', signal: SignalCode.UNTRUSTED_APP },
          { text: 'Read your text messages (SMS or MMS)', signal: SignalCode.SENSITIVE_REQUEST },
          { text: 'View network connections', signal: SignalCode.MISSING_DETAILS, note: 'Almost every app that goes online asks for this harmless permission.' },
          { text: 'Run at startup', signal: SignalCode.OFF_CHANNEL, note: 'Security and sync apps commonly start with the phone; this permission on its own is normal.' },
        ],
      },
    },
    vi: {
      prompt: 'An toàn hay lừa đảo? Một app xin các quyền này, rồi chạm vào chỗ đáng ngờ.',
      title: 'Cài app trợ lý bảo mật',
      scenario: 'Một app trợ lý bảo mật xin quyền khi cài đặt.',
      explanation: 'Quyền hiển thị đè lên ứng dụng khác và đọc tin nhắn SMS (nơi mã OTP gửi về) vượt xa nhu cầu của app kiểu này.',
      scenarioData: {
        appName: { text: 'Security Helper+', signal: SignalCode.TOO_GOOD, note: 'Nhiều app tiện ích thật đặt tên kiểu này; vấn đề không ở tên mà ở nguồn cài và các quyền.' },
        publisher: { text: 'Play Protect chưa từng thấy ứng dụng này. Ứng dụng có thể gây hại cho thiết bị.', signal: SignalCode.UNTRUSTED_APP },
        permissions: [
          { text: 'Hiển thị trên các ứng dụng khác', signal: SignalCode.UNTRUSTED_APP },
          { text: 'Đọc tin nhắn văn bản của bạn (SMS hoặc MMS)', signal: SignalCode.SENSITIVE_REQUEST },
          { text: 'Xem kết nối mạng', signal: SignalCode.MISSING_DETAILS, note: 'Hầu như app nào dùng mạng cũng xin quyền vô hại này.' },
          { text: 'Chạy khi khởi động', signal: SignalCode.OFF_CHANNEL, note: 'App bảo mật hay app đồng bộ thường chạy cùng máy; riêng quyền này là bình thường.' },
        ],
      },
    },
  });

  // Scam QR: sticker over the real QR leads to a lookalike domain.
  await makeQuiz({
    kind: QuizKind.QR_INSPECTION,
    isScam: true,
    isPublic: false,
    order: 11,
    categoryCode: CategoryCode.WALLET,
    signalCodes: [SignalCode.LOOKALIKE_DOMAIN],
    en: {
      prompt: 'Safe or scam? Scan reveals this address — tap it if suspicious.',
      title: 'Parking payment QR code',
      scenario: 'A QR sticker at a parking lot payment point.',
      explanation: 'The decoded address is a look-alike, not the real wallet domain.',
      scenarioData: {
        posterText: { text: 'Scan to pay for parking', signal: SignalCode.URGENCY, note: 'A plain “scan to pay” label is what genuine parking QR signs say.' },
        decodedUrl: { text: 'https://quickpay-pay.xyz/checkout', signal: SignalCode.LOOKALIKE_DOMAIN },
      },
    },
    vi: {
      prompt: 'An toàn hay lừa đảo? Quét ra địa chỉ này — chạm nếu thấy đáng ngờ.',
      title: 'Mã QR thanh toán gửi xe',
      scenario: 'Một mã QR dán tại điểm thanh toán bãi xe.',
      explanation: 'Địa chỉ giải ra là hàng nhái, không phải domain ví thật.',
      scenarioData: {
        posterText: { text: 'Quét để thanh toán phí gửi xe', signal: SignalCode.URGENCY, note: 'Dòng "quét để thanh toán" là chữ in sẵn trên biển QR thật ở bãi xe.' },
        decodedUrl: { text: 'https://paynhanh-pay.xyz/checkout', signal: SignalCode.LOOKALIKE_DOMAIN },
      },
    },
  });

  // Extended set: multi-channel + email (prisma/seed-data).
  for (const q of [...QUIZ_MIXED, ...QUIZ_EMAIL]) await makeQuiz(q);

  const counts = {
    signals: await prisma.signal.count(),
    categories: await prisma.category.count(),
    templates: await prisma.template.count(),
    variants: await prisma.variant.count(),
    brands: await prisma.brand.count(),
    quiz: await prisma.quizQuestion.count(),
  };
  console.log('Seed done:', counts);

  // Promote emails in ADMIN_EMAILS to admin (existing users).
  const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);
  if (adminEmails.length) {
    const { count } = await prisma.user.updateMany({ where: { email: { in: adminEmails } }, data: { role: 'admin' } });
    console.log(`Admin role: ${count} user(s)`);
  }
  console.log('Sample bank variant id:', bankVariant.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
