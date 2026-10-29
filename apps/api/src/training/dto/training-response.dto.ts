/** Response shapes for the training routes (Swagger docs; checked against the services by tsc). */
import {
  QuizQuestion,
  QuizQuestionCategory,
  SignalExplanation,
  SpotView,
} from '../../common/responses.dto';

export class HandbookBrand {
  code!: string;
  name!: string;
  description!: string;
  category!: QuizQuestionCategory | null;
  websites!: string[];
  emailDomains!: string[];
  smsSenders!: string[];
  hotlines!: string[];
  apps!: string[];
  socialPages!: string[];
  paymentAccounts!: string[];
  legalNames!: string[];
  taxCodes!: string[];
  addresses!: string[];
  shortCodes!: string[];
}

/** The next question in the library, or null at the end. */
export class LibraryNextResponse {
  number!: number;
  id!: string;
}

export class LibraryPageItem {
  id!: string;
  seq!: number | null;
  title!: string | null;
  kind!: 'email_inspection' | 'popup' | 'oauth_consent' | 'sms_inspection' | 'chat_inspection' | 'web_inspection' | 'qr_inspection' | 'file_inspection' | 'app_consent';
  level!: number;
  isPublic!: boolean;
  locked!: boolean;
  category!: QuizQuestionCategory | null;
  status!: string | null;
}

export class LibraryPageResponse {
  total!: number;
  page!: number;
  pageSize!: number;
  items!: LibraryPageItem[];
}

export class PracticeRoundResponse {
  items!: QuizQuestion[];
  remaining!: number;
}

export class QuizAnswerResult {
  savedAttempt!: boolean;
  correctAnswerIsScam!: boolean;
  classifyCorrect!: boolean;
  matchedSignals!: SignalExplanation[];
  missedSignals!: SignalExplanation[];
  wrongSignals!: SignalExplanation[];
  decoySpots!: SpotView[];
  correctSpots!: SpotView[];
  explanation!: string;
}

export class TrainingFacetsCategory {
  code!: string;
  name!: string;
  description!: string;
  count!: number;
}

export class TrainingFacetsKind {
  code!: string;
  count!: number;
}

export class TrainingFacetsLevel {
  level!: number;
  count!: number;
}

export class TrainingFacetsSignal {
  code!: string;
  name!: string;
  count!: number;
}

export class TrainingFacetsResponse {
  total!: number;
  locked!: number;
  kinds!: TrainingFacetsKind[];
  levels!: TrainingFacetsLevel[];
  categories!: TrainingFacetsCategory[];
  signals!: TrainingFacetsSignal[];
}
