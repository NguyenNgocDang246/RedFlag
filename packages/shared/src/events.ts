/**
 * EventType — hành vi của user với một bài test (Test flow).
 * QUAN TRỌNG (R2): event chỉ là TÍN HIỆU, không bao giờ kèm PII.
 * "submitted" nghĩa là user chạm tới bước gửi form giả — KHÔNG lưu nội dung đã nhập.
 */
export const EventType = {
  OPENED: 'opened', // mở email (pixel)
  CLICKED: 'clicked', // bấm link trong email
  SUBMITTED: 'submitted', // chạm bước submit trên trang giả (tín hiệu "dính")
  REPORTED: 'reported', // user báo cáo đây là lừa đảo (nhận ra)
  IGNORED: 'ignored', // bỏ qua (suy ra khi hết hạn, không tương tác)
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

export const ALL_EVENT_TYPES = Object.values(EventType);
