/** Response shapes for reports, tracking and cron (Swagger docs; checked against the services by tsc). */
import { QuizQuestionCategory, SignalExplanation } from '../../common/responses.dto';

export class CronDailyResponse {
  planned!: number;
  handedOff!: number;
}

export class ReportCampaign {
  id!: string;
  sentAt!: Date | null;
  senderName!: string;
  subject!: string;
  reported!: boolean;
  signalPicked!: boolean;
  clicked!: boolean;
}

export class ReportResult {
  ok!: boolean;
  signals!: QuizQuestionCategory[];
}

export class TeachContentResponse {
  subject!: string;
  senderName!: string;
  body!: string;
  category!: QuizQuestionCategory | null;
  signals!: SignalExplanation[];
}
