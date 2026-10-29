/** Response shape for the progress route (Swagger docs; checked against the service by tsc). */
import { SignalTally } from '../../common/responses.dto';

export class ProgressContestsRecent {
  id!: string;
  finishedAt!: Date | null;
  score!: number;
  maxScore!: number;
}

export class ProgressContests {
  count!: number;
  best!: number | null;
  recent!: ProgressContestsRecent[];
}

export class ProgressPractice {
  answers!: number;
  scenarios!: number;
}

export class ProgressResponse {
  practice!: ProgressPractice;
  answered!: number;
  correct!: number;
  falseAlarms!: number;
  missedScams!: number;
  contests!: ProgressContests;
  signals!: SignalTally[];
}
