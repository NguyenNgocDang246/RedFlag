/** Response shapes shared by several modules (Swagger docs; checked against the services by tsc). */

/** Id of the created or updated record. */
export class IdResponse {
  id!: string;
}

/** Plain acknowledgement. */
export class OkResponse {
  ok!: boolean;
}

export class QuizQuestionCategory {
  code!: string;
  name!: string;
}

/** A quiz question as the learner sees it — no answer or explanation. */
export class QuizQuestion {
  id!: string;
  number!: number;
  seq!: number | null;
  kind!: string;
  title!: string | null;
  prompt!: string;
  scenario!: string;
  /** Kind-specific scenario payload (email, SMS, web page…). */
  scenarioData!: unknown;
  isPublic!: boolean;
  difficulty!: number;
  category!: QuizQuestionCategory | null;
  signalOptions!: QuizQuestionCategory[];
}

export class SignalExplanation {
  code!: string;
  name!: string;
  explanation!: string;
}

export class SignalTally {
  code!: string;
  name!: string;
  spotted!: number;
  missed!: number;
}

export class SpotView {
  signal!: string;
  text!: string;
  note!: string;
}
