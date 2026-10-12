import { TestFrequency } from '@prisma/client';

/**
 * When the next simulated test should land (R8): a random moment, but always inside the user's local
 * daytime and never more often than the frequency they picked. Pure — no I/O, no clock reads beyond
 * the `from` passed in — so the scheduler's timing is unit-testable.
 */

/** Default local sending window, inclusive start / exclusive end. Override per deployment. */
export const DEFAULT_WINDOW: SendWindow = { startHour: 8, endHour: 20 };

/** Local hours during which a test may arrive. */
export interface SendWindow {
  startHour: number;
  endHour: number;
}

/**
 * Sending window from the environment (SEND_WINDOW_START / SEND_WINDOW_END, local hours).
 * Out-of-range or nonsensical values fall back to the default rather than silently sending at 3am.
 */
export function sendWindowFromEnv(env: NodeJS.ProcessEnv = process.env): SendWindow {
  const hour = (raw: string | undefined, fallback: number) => {
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 && n <= 24 ? n : fallback;
  };
  const startHour = hour(env.SEND_WINDOW_START, DEFAULT_WINDOW.startHour);
  const endHour = hour(env.SEND_WINDOW_END, DEFAULT_WINDOW.endHour);
  return endHour > startHour ? { startHour, endHour } : DEFAULT_WINDOW;
}

/** Average days between tests for each frequency the user can pick. */
export const FREQUENCY_DAYS: Record<Exclude<TestFrequency, 'off'>, number> = {
  low: 14, // about every two weeks
  medium: 7, // about once a week
  high: 3, // 2-3 times a week
};

/** The gap is randomised ±40% around the average so the timing never becomes predictable. */
const JITTER = 0.4;

const DAY_MS = 24 * 60 * 60 * 1000;

interface Wall {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partsOf = (date: Date, timeZone: string): Wall => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    // Intl can render midnight as hour 24.
    hour: get('hour') % 24,
    minute: get('minute'),
    second: get('second'),
  };
};

/** Wall-clock time in `timeZone` at the given instant. */
export function zonedWallClock(date: Date, timeZone: string): Wall {
  return partsOf(date, timeZone);
}

/** The zone's UTC offset (ms) at that instant — handles daylight saving. */
function offsetMs(date: Date, timeZone: string): number {
  const w = partsOf(date, timeZone);
  const asIfUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asIfUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * The instant at which `timeZone` shows this wall-clock time. Two passes, because the offset itself
 * depends on the instant (a one-pass guess lands an hour out either side of a DST switch).
 */
export function instantAtLocal(
  timeZone: string,
  y: number,
  m: number,
  d: number,
  hour: number,
  minute: number,
): Date {
  const wanted = Date.UTC(y, m - 1, d, hour, minute);
  const firstGuess = new Date(wanted - offsetMs(new Date(wanted), timeZone));
  return new Date(wanted - offsetMs(firstGuess, timeZone));
}

/** An IANA zone the runtime knows; anything else (or nothing) falls back to UTC. */
export function safeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    return 'UTC';
  }
}

export interface NextSendArgs {
  /** Last send, or the moment tests were turned on. */
  from: Date;
  frequency: Exclude<TestFrequency, 'off'>;
  timeZone: string | null | undefined;
  /** Defaults to DEFAULT_WINDOW; the scheduler passes the configured one. */
  window?: SendWindow;
  /** Injected for tests. */
  rand?: () => number;
}

/**
 * Picks the next send time: `from` plus the frequency's gap (randomised), moved to a random minute
 * inside the user's local sending window. Never returns a time at or before `from`.
 */
export function nextSendAt({
  from,
  frequency,
  timeZone,
  window = DEFAULT_WINDOW,
  rand = Math.random,
}: NextSendArgs): Date {
  const zone = safeZone(timeZone);
  const spread = 1 - JITTER + rand() * JITTER * 2; // 0.6 … 1.4
  const candidate = new Date(from.getTime() + FREQUENCY_DAYS[frequency] * spread * DAY_MS);

  // Place it at a random minute of the local sending window, on the day the candidate landed on;
  // if that already passed, take the next local day.
  const minuteOfWindow = Math.floor(rand() * (window.endHour - window.startHour) * 60);
  const hour = window.startHour + Math.floor(minuteOfWindow / 60);
  const minute = minuteOfWindow % 60;

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const w = zonedWallClock(new Date(candidate.getTime() + dayOffset * DAY_MS), zone);
    const at = instantAtLocal(zone, w.year, w.month, w.day, hour, minute);
    if (at > from && at >= candidate) return at;
  }
  // Only reachable if the zone behaves very oddly; a day past the candidate is still inside the window.
  return new Date(candidate.getTime() + DAY_MS);
}

/** Whether an instant falls inside the user's local sending window — checked again before sending. */
export function isInSendWindow(
  at: Date,
  timeZone: string | null | undefined,
  window: SendWindow = DEFAULT_WINDOW,
): boolean {
  const { hour } = zonedWallClock(at, safeZone(timeZone));
  return hour >= window.startHour && hour < window.endHour;
}
