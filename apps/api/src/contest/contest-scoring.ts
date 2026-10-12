import { gradeQuiz, type GradeResult } from '../training/grading';

/**
 * Contest scoring — pure (no I/O). Graded by signal (R7) and in both directions (R11):
 * - correct safe/scam call: +CLASSIFY_POINTS (a correct "safe" is a true negative and counts the same);
 * - on a scam answered "scam": +SIGNAL_POINTS per red flag spotted, −SIGNAL_POINTS per decoy picked,
 *   never below 0 for the question;
 * - wrong call (missed scam or false alarm on a safe one): 0.
 */
export const CLASSIFY_POINTS = 10;
export const SIGNAL_POINTS = 2;

/** Best possible score for a question. */
export function maxPointsFor(isScam: boolean, correctSignalCount: number): number {
  return CLASSIFY_POINTS + (isScam ? SIGNAL_POINTS * correctSignalCount : 0);
}

export interface ScoreInput {
  isScam: boolean;
  correctSignals: string[];
  answeredScam: boolean;
  selectedSignals: string[];
}

export interface ScoreResult extends GradeResult {
  points: number;
  maxPoints: number;
}

export function scoreContestItem(input: ScoreInput): ScoreResult {
  // Signals only count once the user calls it a scam — a "safe" answer submits none.
  const selectedSignals = input.answeredScam ? input.selectedSignals : [];
  const grade = gradeQuiz({ ...input, selectedSignals });
  const maxPoints = maxPointsFor(input.isScam, input.correctSignals.length);
  if (!grade.classifyCorrect) return { ...grade, points: 0, maxPoints };
  const signalPoints = input.isScam
    ? SIGNAL_POINTS * (grade.matchedSignals.length - grade.wrongSignals.length)
    : 0;
  return { ...grade, points: Math.max(0, CLASSIFY_POINTS + signalPoints), maxPoints };
}
