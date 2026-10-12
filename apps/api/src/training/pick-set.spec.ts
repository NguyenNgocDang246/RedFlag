import { describe, expect, it } from 'vitest';
import { pickSet, type AttemptStatus, type PoolItem } from './pick-set';

const scams = (n: number, prefix = 's'): PoolItem[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, isScam: true }));

describe('pickSet', () => {
  it('takes 10 by default and reports what is left', () => {
    const r = pickSet({ pool: scams(25) });
    expect(r.ids).toHaveLength(10);
    expect(new Set(r.ids).size).toBe(10);
    expect(r.remaining).toBe(15);
  });

  it('prefers new, then attempted, then solved', () => {
    const pool = [...scams(3, 'new'), ...scams(3, 'bad'), ...scams(3, 'ok')];
    const history = new Map<string, AttemptStatus>([
      ...scams(3, 'bad').map((q) => [q.id, 'attempted'] as const),
      ...scams(3, 'ok').map((q) => [q.id, 'solved'] as const),
    ]);
    const r = pickSet({ pool, history, limit: 5 });
    const picked = new Set(r.ids);
    for (const q of scams(3, 'new')) expect(picked.has(q.id)).toBe(true);
    expect(r.ids.filter((id) => id.startsWith('bad'))).toHaveLength(2);
    expect(r.ids.some((id) => id.startsWith('ok'))).toBe(false);
  });

  it('skips excluded ids ("continue 10 more")', () => {
    const pool = scams(12);
    const first = pickSet({ pool });
    const second = pickSet({ pool, exclude: new Set(first.ids) });
    expect(second.ids).toHaveLength(2);
    expect(second.ids.some((id) => first.ids.includes(id))).toBe(false);
    expect(second.remaining).toBe(0);
  });

  it('keeps at least one genuine item when the pool has one (R11)', () => {
    const pool = [...scams(30), { id: 'safe', isScam: false }];
    for (let i = 0; i < 20; i++) {
      expect(pickSet({ pool }).ids).toContain('safe');
    }
  });

  it('R11 does not pull in an excluded genuine item', () => {
    const pool = [...scams(30), { id: 'safe', isScam: false }];
    expect(pickSet({ pool, exclude: new Set(['safe']) }).ids).not.toContain('safe');
  });

  const safes = (n: number): PoolItem[] => Array.from({ length: n }, (_, i) => ({ id: `g${i}`, isScam: false }));
  const safeCount = (ids: string[]) => ids.filter((id) => id.startsWith('g')).length;

  it('caps safe items at ~30% of a full round', () => {
    for (let i = 0; i < 20; i++) {
      const r = pickSet({ pool: [...scams(30), ...safes(20)] });
      expect(r.ids).toHaveLength(10);
      expect(safeCount(r.ids)).toBe(3);
    }
  });

  it('shrinks safe items when scams are scarce (e.g. a signal filter)', () => {
    // 1 scam + 17 safe — the old pool served almost only safe questions.
    const r = pickSet({ pool: [...scams(1), ...safes(17)] });
    expect(r.ids).toHaveLength(2);
    expect(safeCount(r.ids)).toBe(1);
    expect(r.remaining).toBe(0);

    const r4 = pickSet({ pool: [...scams(4), ...safes(17)] });
    expect(safeCount(r4.ids)).toBe(1);
    expect(r4.ids).toHaveLength(5);
  });

  it('never serves an all-safe round (safe only accompanies scams)', () => {
    expect(pickSet({ pool: safes(4) })).toEqual({ ids: [], remaining: 0 });
  });

  it('returns nothing for an empty pool', () => {
    expect(pickSet({ pool: [] })).toEqual({ ids: [], remaining: 0 });
  });
});
