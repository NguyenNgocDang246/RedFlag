/**
 * SignalCode — scam red flags. Basis of signal-based grading (R7): each variant has 1-2
 * signals; the quiz asks "which signs made you suspicious?" as multiple choice drawn from
 * this set.
 *
 * Internal term (R9) — the UI shows friendly i18n labels, never the code.
 *
 * This is the DEFAULT SEED set, not a closed list: real signals are DATA in the `signals`
 * table (admins can add more — R6). Validate external codes against the DB, not this constant.
 */
export const SignalCode = {
  LOOKALIKE_DOMAIN: 'LOOKALIKE_DOMAIN', // domain that looks like the real one
  SENDER_MISMATCH: 'SENDER_MISMATCH', // sender address doesn't match display name
  HIDDEN_LINK: 'HIDDEN_LINK', // link target differs from its text
  URGENCY: 'URGENCY',
  SENSITIVE_REQUEST: 'SENSITIVE_REQUEST', // asks for OTP/password/card number/ID
  SUSPICIOUS_ATTACHMENT: 'SUSPICIOUS_ATTACHMENT',
  GENERIC_GREETING: 'GENERIC_GREETING',
  SPELLING_ERRORS: 'SPELLING_ERRORS', // typos / machine translation
  TOO_GOOD: 'TOO_GOOD', // too good to be true
  OFF_CHANNEL: 'OFF_CHANNEL', // pushes to another channel (private Zalo/Telegram)
  MISSING_DETAILS: 'MISSING_DETAILS', // lacks specific identifiers (account no./order ID/plate)
  UNTRUSTED_APP: 'UNTRUSTED_APP', // app outside the store / excessive permissions (accessibility)
  PAYMENT_CHANGE: 'PAYMENT_CHANGE', // sudden change of payee account (invoice fraud / BEC)
} as const;

export type SignalCode = (typeof SignalCode)[keyof typeof SignalCode];

export const ALL_SIGNAL_CODES = Object.values(SignalCode);
