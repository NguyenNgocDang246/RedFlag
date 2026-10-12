import { describe, expect, it } from 'vitest';
import { gradeQuiz } from './grading';

describe('gradeQuiz', () => {
  it('scam: splits signals into matched / missed / wrong', () => {
    const r = gradeQuiz({
      isScam: true,
      correctSignals: ['URGENCY', 'LOOKALIKE_DOMAIN'],
      answeredScam: true,
      selectedSignals: ['URGENCY', 'TOO_GOOD'],
    });
    expect(r.classifyCorrect).toBe(true);
    expect(r.matchedSignals).toEqual(['URGENCY']);
    expect(r.missedSignals).toEqual(['LOOKALIKE_DOMAIN']);
    expect(r.wrongSignals).toEqual(['TOO_GOOD']);
  });

  it('scam but user said safe: classify wrong, still reports missed signals', () => {
    const r = gradeQuiz({
      isScam: true,
      correctSignals: ['URGENCY'],
      answeredScam: false,
      selectedSignals: [],
    });
    expect(r.classifyCorrect).toBe(false);
    expect(r.missedSignals).toEqual(['URGENCY']);
  });

  it('safe item: no signal matters; selecting any is "wrong"', () => {
    const r = gradeQuiz({
      isScam: false,
      correctSignals: [],
      answeredScam: false,
      selectedSignals: ['URGENCY'],
    });
    expect(r.classifyCorrect).toBe(true);
    expect(r.matchedSignals).toEqual([]);
    expect(r.wrongSignals).toEqual(['URGENCY']);
  });
});
