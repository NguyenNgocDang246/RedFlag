/**
 * Two independent flows (Training ⟂ Test). Used to tag config/capabilities.
 */
export const Flow = {
  TRAINING: 'training', // self-paced learning (theory + on-site quiz)
  TEST: 'test', // surprise tests via real email (separate opt-in)
} as const;

export type Flow = (typeof Flow)[keyof typeof Flow];

/** User-selected test frequency (Test flow). */
export const TestFrequency = {
  OFF: 'off',
  LOW: 'low', // ~1 per 2 weeks
  MEDIUM: 'medium', // ~1 per week
  HIGH: 'high', // ~2-3 per week
} as const;

export type TestFrequency = (typeof TestFrequency)[keyof typeof TestFrequency];
