/**
 * SignalCode — dấu hiệu lừa đảo. Nền tảng của việc chấm điểm theo signal (R7):
 * mỗi variant gắn 1-2 signal; quiz hỏi "dấu hiệu nào khiến bạn nghi?" dưới dạng
 * trắc nghiệm nhiều lựa chọn lấy từ chính tập này.
 *
 * Thuật ngữ nội bộ (R9) — UI hiển thị nhãn thân thiện qua i18n, không show mã.
 */
export const SignalCode = {
  LOOKALIKE_DOMAIN: 'LOOKALIKE_DOMAIN', // tên miền giả gần giống
  SENDER_MISMATCH: 'SENDER_MISMATCH', // email người gửi lệch với tên hiển thị
  HIDDEN_LINK: 'HIDDEN_LINK', // link ẩn khác chữ hiển thị
  URGENCY: 'URGENCY', // tạo cảm giác khẩn cấp
  SENSITIVE_REQUEST: 'SENSITIVE_REQUEST', // đòi OTP/mật khẩu/số thẻ/giấy tờ
  SUSPICIOUS_ATTACHMENT: 'SUSPICIOUS_ATTACHMENT', // file đính kèm lạ
  GENERIC_GREETING: 'GENERIC_GREETING', // lời chào chung chung
  SPELLING_ERRORS: 'SPELLING_ERRORS', // sai chính tả / dịch máy
  TOO_GOOD: 'TOO_GOOD', // quá tốt để là thật
  OFF_CHANNEL: 'OFF_CHANNEL', // bắt chuyển kênh lạ (Zalo/Telegram riêng)
} as const;

export type SignalCode = (typeof SignalCode)[keyof typeof SignalCode];

export const ALL_SIGNAL_CODES = Object.values(SignalCode);
