/**
 * CategoryCode — "template cha": nhóm kịch bản lừa.
 * Đây là thuật ngữ NỘI BỘ (R9): không hiển thị trực tiếp lên UI người dùng.
 * Danh mục thực tế là DATA trong bảng `categories` (R6); enum này chỉ là
 * tập mã ổn định để code tham chiếu an toàn về kiểu.
 */
export const CategoryCode = {
  BANK: 'BANK', // Ngân hàng
  WALLET: 'WALLET', // Ví điện tử
  SHIP: 'SHIP', // Giao hàng
  GOV: 'GOV', // Cơ quan nhà nước
  JOB: 'JOB', // Tuyển dụng / việc nhẹ lương cao
  BEC: 'BEC', // Nội bộ công ty (sếp/kế toán/HR)
  SUBSCR: 'SUBSCR', // Dịch vụ số (Netflix/Google/Apple...)
  SOCIAL: 'SOCIAL', // Người quen (mượn tiền, nhờ vote)
  ECOM: 'ECOM', // Sàn TMĐT
  TELCO: 'TELCO', // Nhà mạng
  UTIL: 'UTIL', // Điện nước
  CUSTOMS: 'CUSTOMS', // Bưu kiện hải quan
  LOAN: 'LOAN', // Vay / tín dụng
  INVEST: 'INVEST', // Đầu tư
  CHARITY: 'CHARITY', // Từ thiện
} as const;

export type CategoryCode = (typeof CategoryCode)[keyof typeof CategoryCode];

export const ALL_CATEGORY_CODES = Object.values(CategoryCode);
