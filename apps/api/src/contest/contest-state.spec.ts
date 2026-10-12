import { describe, expect, it } from 'vitest';
import { CONTEST_GRACE_SECONDS } from '@redflag/shared';
import { deadlineOf, onAnswer, onServe } from './contest-state';

const T0 = new Date('2026-10-12T10:00:00Z');
const at = (sec: number) => new Date(T0.getTime() + sec * 1000);

describe('onServe', () => {
  it('first request serves the question', () => {
    expect(onServe({ servedAt: null, outcome: null }, T0, 60)).toBe('serve');
  });

  it('asking again before the deadline forfeits it (reload / back)', () => {
    expect(onServe({ servedAt: T0, outcome: null }, at(5), 60)).toBe('forfeit');
  });

  it('asking again at/after the deadline is a timeout', () => {
    expect(onServe({ servedAt: T0, outcome: null }, at(60), 60)).toBe('timeout');
  });
});

describe('onAnswer', () => {
  const open = { position: 2, servedAt: T0, outcome: null };

  it('accepts within the time limit + grace', () => {
    expect(onAnswer(open, 2, at(30), 60)).toBe('accept');
    expect(onAnswer(open, 2, at(60 + CONTEST_GRACE_SECONDS), 60)).toBe('accept');
  });

  it('times out after the grace period', () => {
    expect(onAnswer(open, 2, at(61 + CONTEST_GRACE_SECONDS), 60)).toBe('timeout');
  });

  it('rejects answers for another position or an already closed question', () => {
    expect(onAnswer(open, 3, at(1), 60)).toBe('wrong-position');
    expect(onAnswer({ ...open, outcome: 'forfeited' }, 2, at(1), 60)).toBe(
      'wrong-position',
    );
  });

  it('rejects answers for a question never shown', () => {
    expect(onAnswer({ ...open, servedAt: null }, 2, at(1), 60)).toBe('not-served');
  });

  it('deadlineOf', () => {
    expect(deadlineOf(T0, 60).toISOString()).toBe('2026-10-12T10:01:00.000Z');
  });
});
