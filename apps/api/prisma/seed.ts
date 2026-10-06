import { PrismaClient } from '@prisma/client';
import { CategoryCode, SignalCode } from '@phishgym/shared';

const prisma = new PrismaClient();

// ─── Nội dung dấu hiệu (signal) — song ngữ EN/VI ───
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
};

// ─── Category — song ngữ ───
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
];

async function clearCatalog() {
  // Xoá theo thứ tự FK (Phase 1 chưa có campaign/user nên an toàn).
  await prisma.lessonTranslation.deleteMany();
  await prisma.lesson.deleteMany();
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
  for (const c of CATEGORIES) {
    const cat = await prisma.category.create({
      data: {
        code: c.code,
        impersonates: c.impersonates,
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
              'We could not deliver your parcel. Pay the fee at track-parcel-pay.example (link text: official-post.gov).',
          },
          {
            locale: 'vi',
            renderedSubject: 'Bưu kiện của bạn đang chờ — cần đóng phí hải quan nhỏ',
            renderedBody:
              'Chúng tôi không giao được bưu kiện. Đóng phí tại track-parcel-pay.example (chữ link ghi: official-post.gov).',
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

  // Lessons gắn signal
  await prisma.lesson.create({
    data: {
      signalId: signalIdByCode[SignalCode.URGENCY],
      categoryId: null,
      translations: {
        create: [
          {
            locale: 'en',
            title: 'Why urgency is a red flag',
            content:
              'Real institutions give you time. "Act now or lose access" is designed to stop you thinking. Pause and verify through the official app or website.',
          },
          {
            locale: 'vi',
            title: 'Vì sao "khẩn cấp" là dấu hiệu đáng ngờ',
            content:
              'Tổ chức thật luôn cho bạn thời gian. Câu "làm ngay kẻo mất quyền truy cập" cốt để bạn ngừng suy nghĩ. Hãy dừng lại và kiểm tra qua app/website chính thức.',
          },
        ],
      },
    },
  });

  await prisma.lesson.create({
    data: {
      signalId: signalIdByCode[SignalCode.LOOKALIKE_DOMAIN],
      categoryId: categoryIdByCode[CategoryCode.BANK],
      translations: {
        create: [
          {
            locale: 'en',
            title: 'Spotting look-alike web addresses',
            content:
              'Check the domain carefully: extra words, dashes or swapped letters (l vs i) are classic tricks. Type the official address yourself instead of clicking.',
          },
          {
            locale: 'vi',
            title: 'Nhận ra tên miền giả gần giống',
            content:
              'Soi kỹ tên miền: thêm chữ, dấu gạch ngang hay đổi chữ (l thành i) là chiêu quen thuộc. Hãy tự gõ địa chỉ chính thức thay vì bấm vào link.',
          },
        ],
      },
    },
  });

  const counts = {
    signals: await prisma.signal.count(),
    categories: await prisma.category.count(),
    templates: await prisma.template.count(),
    variants: await prisma.variant.count(),
    lessons: await prisma.lesson.count(),
  };
  console.log('Seed done:', counts);
  console.log('Sample bank variant id:', bankVariant.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
