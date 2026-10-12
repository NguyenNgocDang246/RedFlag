/**
 * CategoryCode — parent scenario template (scam group). Internal term (R9), never shown in the UI.
 * Real categories are DATA in the `categories` table (R6); this enum only gives stable, type-safe codes.
 */
export const CategoryCode = {
  BANK: 'BANK',
  WALLET: 'WALLET', // e-wallet
  SHIP: 'SHIP', // delivery
  GOV: 'GOV', // government agency
  JOB: 'JOB', // recruitment / easy-money jobs
  BEC: 'BEC', // internal company (boss/accounting/HR)
  SUBSCR: 'SUBSCR', // digital subscriptions (Netflix/Google/Apple...)
  SOCIAL: 'SOCIAL', // acquaintance (borrowing money, asking for votes)
  ECOM: 'ECOM', // e-commerce
  TELCO: 'TELCO',
  UTIL: 'UTIL', // utilities (power/water)
  CUSTOMS: 'CUSTOMS', // customs parcel
  LOAN: 'LOAN', // loan / credit
  INVEST: 'INVEST',
  CHARITY: 'CHARITY',
  EDU: 'EDU', // education / scholarships
  ACC: 'ACC', // accounts & storage (email, cloud drive)
} as const;

export type CategoryCode = (typeof CategoryCode)[keyof typeof CategoryCode];

export const ALL_CATEGORY_CODES = Object.values(CategoryCode);
