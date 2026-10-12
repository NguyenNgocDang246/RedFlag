/**
 * Quiz grading — pure function (no I/O) for easy unit testing.
 * Two levels: (1) was safe/scam classified correctly,
 * (2) if scam, which signals were recognized (R7).
 */
export interface GradeInput {
  isScam: boolean; // correct answer
  correctSignals: string[]; // signals actually present in the scenario
  answeredScam: boolean; // user picked "scam"?
  selectedSignals: string[];
}

export interface GradeResult {
  classifyCorrect: boolean;
  matchedSignals: string[]; // recognized correctly
  missedSignals: string[]; // present but missed
  wrongSignals: string[]; // picked but not present
}

export function gradeQuiz(input: GradeInput): GradeResult {
  const classifyCorrect = input.answeredScam === input.isScam;
  const correct = new Set(input.correctSignals);
  const selected = new Set(input.selectedSignals);

  // Signals only count when the scenario is a scam.
  const matchedSignals = input.isScam
    ? input.correctSignals.filter((s) => selected.has(s))
    : [];
  const missedSignals = input.isScam
    ? input.correctSignals.filter((s) => !selected.has(s))
    : [];
  const wrongSignals = input.selectedSignals.filter((s) => !correct.has(s));

  return { classifyCorrect, matchedSignals, missedSignals, wrongSignals };
}
