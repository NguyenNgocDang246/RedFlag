import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WINDOW,
  FREQUENCY_DAYS,
  instantAtLocal,
  isInSendWindow,
  nextSendAt,
  safeZone,
  sendWindowFromEnv,
  zonedWallClock,
} from './send-window';

const SAIGON = 'Asia/Ho_Chi_Minh'; // UTC+7, no daylight saving
const NY = 'America/New_York'; // UTC-5 / -4, daylight saving
const from = new Date('2026-03-01T00:00:00Z');

/** Fixed sequence so a draw is reproducible; cycles if the code asks for more. */
const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('nextSendAt', () => {
  it('always lands inside the local sending window', () => {
    for (const timeZone of [SAIGON, NY, 'UTC', 'Pacific/Kiritimati']) {
      for (let i = 0; i < 50; i++) {
        const at = nextSendAt({ from, frequency: 'medium', timeZone });
        const { hour } = zonedWallClock(at, timeZone);
        expect(hour).toBeGreaterThanOrEqual(DEFAULT_WINDOW.startHour);
        expect(hour).toBeLessThan(DEFAULT_WINDOW.endHour);
      }
    }
  });

  it('keeps the gap within ±40% of the frequency average', () => {
    for (const frequency of ['low', 'medium', 'high'] as const) {
      for (let i = 0; i < 50; i++) {
        const at = nextSendAt({ from, frequency, timeZone: SAIGON });
        const days = (at.getTime() - from.getTime()) / 86_400_000;
        const avg = FREQUENCY_DAYS[frequency];
        // The window snap can push it up to one more local day out.
        expect(days).toBeGreaterThan(avg * 0.6 - 1);
        expect(days).toBeLessThan(avg * 1.4 + 1);
      }
    }
  });

  it('spaces "low" far wider apart than "high"', () => {
    const rand = () => 0.5;
    const low = nextSendAt({ from, frequency: 'low', timeZone: SAIGON, rand });
    const high = nextSendAt({ from, frequency: 'high', timeZone: SAIGON, rand });
    expect(low.getTime()).toBeGreaterThan(high.getTime());
  });

  it('is always strictly after the starting point', () => {
    for (let i = 0; i < 30; i++) {
      // Smallest possible gap: minimum jitter, earliest minute of the window.
      const at = nextSendAt({ from, frequency: 'high', timeZone: SAIGON, rand: seq([0, 0]) });
      expect(at.getTime()).toBeGreaterThan(from.getTime());
    }
  });

  it('an unknown or missing zone falls back to UTC instead of throwing', () => {
    expect(safeZone('Mars/Olympus')).toBe('UTC');
    expect(safeZone(null)).toBe('UTC');
    const at = nextSendAt({ from, frequency: 'medium', timeZone: 'Mars/Olympus' });
    expect(zonedWallClock(at, 'UTC').hour).toBeGreaterThanOrEqual(DEFAULT_WINDOW.startHour);
  });
});

describe('instantAtLocal', () => {
  it('maps local wall-clock time to the right instant', () => {
    // 09:30 in UTC+7 is 02:30 UTC.
    expect(instantAtLocal(SAIGON, 2026, 3, 10, 9, 30).toISOString()).toBe('2026-03-10T02:30:00.000Z');
  });

  it('handles both sides of a daylight-saving switch', () => {
    // New York moves to UTC-4 on 8 March 2026.
    expect(instantAtLocal(NY, 2026, 3, 1, 9, 0).toISOString()).toBe('2026-03-01T14:00:00.000Z');
    expect(instantAtLocal(NY, 2026, 3, 15, 9, 0).toISOString()).toBe('2026-03-15T13:00:00.000Z');
  });
});

describe('isInSendWindow', () => {
  it('accepts local daytime and rejects the small hours', () => {
    expect(isInSendWindow(instantAtLocal(SAIGON, 2026, 3, 10, 9, 0), SAIGON)).toBe(true);
    expect(isInSendWindow(instantAtLocal(SAIGON, 2026, 3, 10, 3, 0), SAIGON)).toBe(false);
    expect(isInSendWindow(instantAtLocal(SAIGON, 2026, 3, 10, 21, 0), SAIGON)).toBe(false);
    // Same instant, different zone: 09:00 in Saigon is the middle of the night in New York.
    expect(isInSendWindow(instantAtLocal(SAIGON, 2026, 3, 10, 9, 0), NY)).toBe(false);
  });
});

describe('sendWindowFromEnv', () => {
  it('reads the configured window', () => {
    expect(sendWindowFromEnv({ SEND_WINDOW_START: '9', SEND_WINDOW_END: '18' })).toEqual({
      startHour: 9,
      endHour: 18,
    });
  });

  it('falls back to the default when unset or nonsensical', () => {
    expect(sendWindowFromEnv({})).toEqual(DEFAULT_WINDOW);
    expect(sendWindowFromEnv({ SEND_WINDOW_START: '20', SEND_WINDOW_END: '8' })).toEqual(DEFAULT_WINDOW);
    expect(sendWindowFromEnv({ SEND_WINDOW_START: 'noon' })).toEqual(DEFAULT_WINDOW);
  });

  it('respects a custom window when drawing a time', () => {
    const window = { startHour: 10, endHour: 12 };
    for (let i = 0; i < 30; i++) {
      const at = nextSendAt({ from, frequency: 'medium', timeZone: SAIGON, window });
      const { hour } = zonedWallClock(at, SAIGON);
      expect(hour).toBeGreaterThanOrEqual(10);
      expect(hour).toBeLessThan(12);
    }
  });
});
