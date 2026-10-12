/**
 * EventType — user behavior on a test email (Test flow).
 * IMPORTANT (R2): events are SIGNALS only, never PII.
 * "submitted" means the user reached the fake form's submit step — entered values are NOT stored.
 */
export const EventType = {
  OPENED: 'opened', // email opened (pixel)
  CLICKED: 'clicked', // link in the email clicked
  SUBMITTED: 'submitted', // reached submit on the fake page ("caught")
  REPORTED: 'reported', // user reported it as a scam
  IGNORED: 'ignored', // inferred on expiry with no interaction
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

export const ALL_EVENT_TYPES = Object.values(EventType);
