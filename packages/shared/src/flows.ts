/**
 * Hai flow độc lập (Training ⟂ Test). Dùng để đánh dấu cấu hình/khả năng.
 */
export const Flow = {
  TRAINING: 'training', // chủ động học (lý thuyết + quiz on-site)
  TEST: 'test', // bị test bất ngờ qua email thật (opt-in riêng)
} as const;

export type Flow = (typeof Flow)[keyof typeof Flow];

/** Tần suất test do user chọn (Test flow). */
export const TestFrequency = {
  OFF: 'off',
  LOW: 'low', // ~1 bài / 2 tuần
  MEDIUM: 'medium', // ~1 bài / tuần
  HIGH: 'high', // ~2-3 bài / tuần
} as const;

export type TestFrequency = (typeof TestFrequency)[keyof typeof TestFrequency];
