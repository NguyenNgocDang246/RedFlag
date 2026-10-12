import { describe, expect, it } from 'vitest';
import { maxPointsFor, scoreContestItem } from './contest-scoring';

const scam = { isScam: true, correctSignals: ['URGENCY', 'LOOKALIKE_DOMAIN'] };
const safe = { isScam: false, correctSignals: [] };

describe('scoreContestItem', () => {
  it('scam caught with every red flag → full marks', () => {
    const r = scoreContestItem({
      ...scam,
      answeredScam: true,
      selectedSignals: ['URGENCY', 'LOOKALIKE_DOMAIN'],
    });
    expect(r.points).toBe(14);
    expect(r.maxPoints).toBe(14);
  });

  it('decoys cost points; a scam call never drops below 0', () => {
    expect(
      scoreContestItem({ ...scam, answeredScam: true, selectedSignals: ['URGENCY', 'X'] })
        .points,
    ).toBe(10);
    expect(
      scoreContestItem({
        ...scam,
        answeredScam: true,
        selectedSignals: ['A', 'B', 'C', 'D', 'E', 'F'],
      }).points,
    ).toBe(0);
  });

  it('missed scam → 0', () => {
    const r = scoreContestItem({ ...scam, answeredScam: false, selectedSignals: [] });
    expect(r.points).toBe(0);
    expect(r.classifyCorrect).toBe(false);
  });

  it('safe recognized as safe (true negative) → full marks, picks ignored', () => {
    const r = scoreContestItem({
      ...safe,
      answeredScam: false,
      selectedSignals: ['URGENCY'],
    });
    expect(r.points).toBe(10);
    expect(r.maxPoints).toBe(10);
    expect(r.wrongSignals).toEqual([]);
  });

  it('false alarm on a safe one → 0, picks recorded as wrong', () => {
    const r = scoreContestItem({
      ...safe,
      answeredScam: true,
      selectedSignals: ['URGENCY'],
    });
    expect(r.points).toBe(0);
    expect(r.wrongSignals).toEqual(['URGENCY']);
  });

  it('maxPointsFor', () => {
    expect(maxPointsFor(true, 3)).toBe(16);
    expect(maxPointsFor(false, 0)).toBe(10);
  });
});
