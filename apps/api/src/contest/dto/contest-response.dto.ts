/** Response shapes for the contest routes (Swagger docs; checked against the services by tsc). */
import {
  QuizQuestion,
  SignalExplanation,
  SignalTally,
  SpotView,
} from '../../common/responses.dto';

export class ContestAnswerResult {
  finished!: boolean;
  timedOut!: boolean;
}

/** Either the open question, or `finished: true` (with `skipped` when the previous question ran out). */
export class ContestCurrentResponse {
  finished!: boolean;
  skipped?: 'timeout' | 'forfeit';
  position?: number;
  total?: number;
  itemSeconds?: number;
  deadline?: string;
  question?: QuizQuestion;
}

export class ContestHistoryActive {
  id!: string;
  startedAt!: Date;
}

export class ContestHistoryItem {
  total!: number;
  id!: string;
  score!: number;
  maxScore!: number;
  startedAt!: Date;
  finishedAt!: Date | null;
}

export class ContestHistoryResponse {
  active!: ContestHistoryActive | null;
  items!: ContestHistoryItem[];
}

export class ContestResultItemReview {
  correctAnswerIsScam!: boolean;
  classifyCorrect!: boolean;
  matchedSignals!: SignalExplanation[];
  missedSignals!: SignalExplanation[];
  wrongSignals!: SignalExplanation[];
  decoySpots!: SpotView[];
  correctSpots!: SpotView[];
  explanation!: string;
}

export class ContestResultItem {
  position!: number;
  outcome!: 'answered' | 'forfeited' | 'timeout' | null;
  points!: number;
  maxPoints!: number;
  answeredScam!: boolean | null;
  selectedSignals!: string[];
  selectedSpots!: string[];
  question!: QuizQuestion;
  review!: ContestResultItemReview;
}

export class ContestResultResponse {
  id!: string;
  startedAt!: Date;
  finishedAt!: Date | null;
  score!: number;
  maxScore!: number;
  total!: number;
  correct!: number;
  falseAlarms!: number;
  missedScams!: number;
  decoyPicks!: number;
  signals!: SignalTally[];
  items!: ContestResultItem[];
}
