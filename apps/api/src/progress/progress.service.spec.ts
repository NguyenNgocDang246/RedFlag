import { describe, expect, it } from 'vitest';
import { tallySignals } from './progress.service';

describe('tallySignals', () => {
  it('counts spotted and missed per signal across answers', () => {
    const t = new Map<string, { spotted: number; missed: number }>();
    tallySignals(t, ['URGENCY'], ['LOOKALIKE_DOMAIN']);
    tallySignals(t, ['URGENCY', 'LOOKALIKE_DOMAIN'], []);
    expect(t.get('URGENCY')).toEqual({ spotted: 2, missed: 0 });
    expect(t.get('LOOKALIKE_DOMAIN')).toEqual({ spotted: 1, missed: 1 });
  });
});
