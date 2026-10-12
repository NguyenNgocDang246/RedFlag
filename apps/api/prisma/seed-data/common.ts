import { CategoryCode, type ScenarioData } from '@redflag/shared';

/** Hotspot: mẩu nội dung chạm được, mang một signal. */
/** Hotspot span; `href` = real link destination, revealed only on hover/tap. */
export const h = (text: string, signal: string, href?: string) =>
  href ? { text, signal, href } : { text, signal };

/** Decoy hotspot: signal NOT in the answer set + `note` = why it is normal in THIS quiz (never shared). */
export const d = (text: string, signal: string, note: string, href?: string) =>
  href ? { text, signal, href, note } : { text, signal, note };

export type Level = 1 | 2 | 3; // 1 = dễ, 2 = vừa, 3 = khó

/** Nội dung một locale. `title` trung tính cho thư viện — KHÔNG lộ đáp án. */
export interface QText {
  title: string;
  prompt: string;
  scenario: string;
  explanation: string;
  scenarioData: ScenarioData;
}

export interface QuizSeed {
  order: number;
  kind: string;
  isScam: boolean;
  difficulty: Level;
  isPublic: boolean;
  categoryCode: string;
  signalCodes: string[];
  en: QText;
  vi: QText;
}

/** Câu hỏi chuẩn theo loại vỏ — một nguồn duy nhất, dùng chung với CLI dữ liệu. */
export { PROMPT } from '../../src/cli/templates';

/** Chủ đề bổ sung (ngoài 8 chủ đề gốc trong seed.ts). */
export const EXTRA_CATEGORIES: {
  code: string;
  impersonates: string[];
  en: [string, string];
  vi: [string, string];
}[] = [
  {
    code: CategoryCode.WALLET,
    impersonates: ['PayNhanh', 'QuickPay'],
    en: ['E-wallet', 'Fake cashback, top-up or verification messages from payment apps.'],
    vi: ['Ví điện tử', 'Tin hoàn tiền, nạp tiền hay xác minh giả từ ví điện tử.'],
  },
  {
    code: CategoryCode.GOV,
    impersonates: ['Tax office', 'Police', 'Court'],
    en: ['Government', 'Someone pretending to be the tax office, police or a court.'],
    vi: ['Cơ quan nhà nước', 'Kẻ gian giả danh cơ quan thuế, công an hay toà án.'],
  },
  {
    code: CategoryCode.JOB,
    impersonates: ['Recruiters'],
    en: ['Jobs', 'Easy-money jobs and fake recruiters.'],
    vi: ['Tuyển dụng', 'Việc nhẹ lương cao và nhà tuyển dụng giả.'],
  },
  {
    code: CategoryCode.INVEST,
    impersonates: ['Investment experts'],
    en: ['Investment', 'Guaranteed returns, private trading groups and fake platforms.'],
    vi: ['Đầu tư', 'Cam kết lợi nhuận, nhóm kín và sàn đầu tư giả.'],
  },
  {
    code: CategoryCode.BEC,
    impersonates: ['Your boss', 'IT', 'Suppliers'],
    en: ['Workplace', 'Fake requests from your boss, IT team or suppliers.'],
    vi: ['Nội bộ công ty', 'Yêu cầu giả từ sếp, phòng IT hay nhà cung cấp.'],
  },
  {
    code: CategoryCode.UTIL,
    impersonates: ['Brightline Energy', 'Điện lực Bình Minh'],
    en: ['Utilities', 'Fake electricity or water bills and disconnection threats.'],
    vi: ['Điện nước', 'Hoá đơn điện nước giả và doạ cắt dịch vụ.'],
  },
  {
    code: CategoryCode.LOAN,
    impersonates: ['Instant loan apps'],
    en: ['Loans', 'Instant approvals that ask for a fee first.'],
    vi: ['Vay tiền', 'Duyệt vay siêu tốc nhưng đòi phí trước.'],
  },
  {
    code: CategoryCode.CHARITY,
    impersonates: ['Relief funds'],
    en: ['Charity', 'Fake fundraisers, often right after a disaster.'],
    vi: ['Từ thiện', 'Quyên góp giả, thường xuất hiện ngay sau thiên tai.'],
  },
  {
    code: CategoryCode.CUSTOMS,
    impersonates: ['Customs'],
    en: ['Customs', 'International parcels “held” until you pay a fee.'],
    vi: ['Hải quan', 'Bưu kiện quốc tế bị "giữ" cho tới khi bạn đóng phí.'],
  },
];

/** Thương hiệu bổ sung cho sổ tay (mỗi locale một bộ — khớp thương hiệu trong bài). */
export const EXTRA_BRANDS: {
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
    code: 'GIAONHANH',
    name: 'GiaoNhanh Express',
    categoryCode: CategoryCode.SHIP,
    description: 'Giao hàng. Không thu phí qua link trong tin nhắn — phí (nếu có) trả cho shipper hoặc trong app.',
    websites: ['giaonhanh.vn'],
    emailDomains: ['giaonhanh.vn'],
    smsSenders: ['GiaoNhanh'],
    hotlines: ['1800 555 050'],
    apps: ['GiaoNhanh — GiaoNhanh Express JSC'],
  },
  {
    locale: 'vi',
    code: 'PHIMPLUS',
    name: 'PhimPlus',
    categoryCode: CategoryCode.SUBSCR,
    description: 'Dịch vụ xem phim. Đổi thẻ thanh toán chỉ trong mục Cài đặt của app hoặc phimplus.vn.',
    websites: ['phimplus.vn'],
    emailDomains: ['phimplus.vn'],
    apps: ['PhimPlus — PhimPlus Media'],
    socialPages: ['facebook.com/phimplus.vn'],
  },
  {
    locale: 'vi',
    code: 'DH_BINHMINH',
    name: 'Trường ĐH Bình Minh',
    categoryCode: CategoryCode.EDU,
    description: 'Trường đại học. Cổng sinh viên chỉ ở sv.binhminh.edu.vn; xét học bổng không thu phí.',
    websites: ['binhminh.edu.vn', 'sv.binhminh.edu.vn'],
    emailDomains: ['binhminh.edu.vn'],
    hotlines: ['028 3555 0060'],
    socialPages: ['facebook.com/dhbinhminh'],
  },
  {
    locale: 'vi',
    code: 'ANHDUONG_TECH',
    name: 'Ánh Dương Tech',
    categoryCode: CategoryCode.BEC,
    description: 'Công ty (giả định là nơi bạn làm việc). Email nội bộ chỉ dùng @anhduongtech.vn.',
    websites: ['anhduongtech.vn'],
    emailDomains: ['anhduongtech.vn'],
    hotlines: ['028 3555 0070'],
  },
  {
    locale: 'vi',
    code: 'DIENLUC_BINHMINH',
    name: 'Điện lực Bình Minh',
    categoryCode: CategoryCode.UTIL,
    description: 'Công ty điện lực. Thông báo cắt điện được gửi trước nhiều ngày, không đòi trả tiền qua link.',
    websites: ['dienlucbinhminh.vn'],
    emailDomains: ['dienlucbinhminh.vn'],
    smsSenders: ['DIENLUC BM'],
    hotlines: ['1800 555 080'],
    apps: ['Điện lực Bình Minh — Điện lực Bình Minh'],
  },
  // ── en ──
  {
    locale: 'en',
    code: 'SWIFTPARCEL',
    name: 'SwiftParcel',
    categoryCode: CategoryCode.SHIP,
    description: 'Courier. Never collects fees through a link in a text — any fee is paid in the app or to the courier.',
    websites: ['swiftparcel.com'],
    emailDomains: ['swiftparcel.com'],
    smsSenders: ['SwiftParcel'],
    hotlines: ['1-800-555-0150'],
    apps: ['SwiftParcel — SwiftParcel Inc.'],
  },
  {
    locale: 'en',
    code: 'STREAMBOX',
    name: 'StreamBox',
    categoryCode: CategoryCode.SUBSCR,
    description: 'Streaming service. Payment cards are only changed in the app’s Settings or on streambox.com.',
    websites: ['streambox.com'],
    emailDomains: ['streambox.com'],
    apps: ['StreamBox — StreamBox Media'],
    socialPages: ['facebook.com/streambox'],
  },
  {
    locale: 'en',
    code: 'BRIGHTWATER_UNI',
    name: 'Brightwater University',
    categoryCode: CategoryCode.EDU,
    description: 'University. The student portal is only at students.brightwater.edu; scholarships never charge a fee.',
    websites: ['brightwater.edu', 'students.brightwater.edu'],
    emailDomains: ['brightwater.edu'],
    hotlines: ['1-800-555-0160'],
    socialPages: ['facebook.com/brightwateruni'],
  },
  {
    locale: 'en',
    code: 'LUMEN_TECH',
    name: 'Lumen Tech',
    categoryCode: CategoryCode.BEC,
    description: 'Company (assume this is where you work). Internal email only uses @lumentech.com.',
    websites: ['lumentech.com'],
    emailDomains: ['lumentech.com'],
    hotlines: ['1-800-555-0170'],
  },
  {
    locale: 'en',
    code: 'BRIGHTLINE_ENERGY',
    name: 'Brightline Energy',
    categoryCode: CategoryCode.UTIL,
    description: 'Electricity provider. Disconnection notices come days in advance and never ask you to pay through a link.',
    websites: ['brightlineenergy.com'],
    emailDomains: ['brightlineenergy.com'],
    smsSenders: ['BRIGHTLINE'],
    hotlines: ['1-800-555-0180'],
    apps: ['Brightline — Brightline Energy'],
  },
];

/** Chấm lại độ khó của câu gốc (theo `order`). */
export const RERATE: Record<number, Level> = { 2: 2, 4: 2, 6: 2, 10: 3 };
