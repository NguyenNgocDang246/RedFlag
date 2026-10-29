/** Response shapes for the admin routes (Swagger docs; checked against the services by tsc). */
import { QuizQuestionCategory } from '../../common/responses.dto';
import { TemplateTitlesDto, VariantTextsDto } from './test-email.dto';

export class AdminAuditEntry {
  id!: string;
  action!: string;
  entity!: string;
  entityId!: string;
  /** Before/after values of the changed fields. */
  changes!: unknown | null;
  actor!: string | null;
  createdAt!: Date;
}

export class AdminBrand {
  id!: string;
  code!: string;
  locale!: 'en' | 'vi';
  name!: string;
  description!: string;
  categoryCode!: string | null;
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
  order!: number;
  status!: 'draft' | 'published';
}

export class AdminCategoryText {
  name!: string;
  description!: string;
}

export class AdminCategoryTranslations {
  en!: AdminCategoryText;
  vi!: AdminCategoryText;
}

export class AdminCategoryUsage {
  quiz!: number;
  templates!: number;
}

export class AdminCategory {
  id!: string;
  code!: string;
  impersonates!: string[];
  order!: number;
  translations!: AdminCategoryTranslations;
  usage!: AdminCategoryUsage;
}

export class AdminQuizCreated {
  id!: string;
  status!: 'draft';
  issues!: string[];
}

export class AdminQuizText {
  title?: string;
  prompt!: string;
  explanation!: string;
  scenario?: string;
  /** Kind-specific scenario payload (email, SMS, web page…). */
  scenarioData!: unknown;
}

export class AdminQuizDetailTranslations {
  en!: AdminQuizText | null;
  vi!: AdminQuizText | null;
}

export class AdminQuizDetail {
  id!: string;
  number!: number;
  kind!: 'email_inspection' | 'popup' | 'oauth_consent' | 'sms_inspection' | 'chat_inspection' | 'web_inspection' | 'qr_inspection' | 'file_inspection' | 'app_consent';
  isScam!: boolean;
  difficultyLevel!: number;
  categoryCode?: string | null;
  isPublic!: boolean;
  order!: number;
  status!: 'draft' | 'published';
  signalCodes!: string[];
  translations!: AdminQuizDetailTranslations;
  issues!: string[];
  updatedAt!: Date;
}

export class LocalizedText {
  en!: string;
  vi!: string;
}

export class AdminQuizPageItem {
  id!: string;
  number!: number;
  kind!: 'email_inspection' | 'popup' | 'oauth_consent' | 'sms_inspection' | 'chat_inspection' | 'web_inspection' | 'qr_inspection' | 'file_inspection' | 'app_consent';
  isScam!: boolean;
  isPublic!: boolean;
  status!: 'draft' | 'published';
  order!: number;
  difficultyLevel!: number;
  categoryCode?: string | null;
  signalCodes!: string[];
  prompt!: LocalizedText;
  title!: LocalizedText;
  issueCount!: number;
  attempts!: number;
  updatedAt!: Date;
}

export class AdminQuizPage {
  total!: number;
  page!: number;
  pageSize!: number;
  items!: AdminQuizPageItem[];
}

export class AdminSaveResult {
  id!: string;
  status!: 'draft' | 'published';
  issues!: string[];
}

export class AdminSendToSelfResult {
  ok!: boolean;
  campaignId!: string;
}

export class AdminSignalText {
  name!: string;
  explanation!: string;
}

export class AdminSignalTranslations {
  en!: AdminSignalText;
  vi!: AdminSignalText;
}

export class AdminSignalUsage {
  quiz!: number;
  variants!: number;
  hotspots!: number;
}

export class AdminSignal {
  id!: string;
  code!: string;
  translations!: AdminSignalTranslations;
  usage!: AdminSignalUsage;
}

export class AdminStatusResult {
  id!: string;
  status!: 'draft' | 'published';
}

export class AdminTestEmailDetailVariant {
  sent!: number;
  id?: string;
  difficultyLevel!: number;
  signalCodes!: string[];
  translations!: VariantTextsDto;
}

export class AdminTestEmailDetail {
  variants!: AdminTestEmailDetailVariant[];
  issues!: string[];
  updatedAt!: Date;
  code?: string;
  categoryCode!: string;
  titles!: TemplateTitlesDto;
  status!: 'draft' | 'published';
  id!: string;
}

export class AdminTestEmailPreview {
  subject!: string;
  html!: string;
  text!: string;
  senderName!: string;
}

export class AdminTestEmailSaved {
  id!: string;
  status!: string;
  issues!: string[];
}

export class AdminTestEmailSummaryVariant {
  id!: string;
  difficulty!: number;
  locales!: ('en' | 'vi')[];
  subject!: string;
  senderName!: string;
  signals!: string[];
  sent!: number;
}

export class AdminTestEmailSummary {
  id!: string;
  code!: string;
  status!: 'draft' | 'published';
  title!: string;
  category!: QuizQuestionCategory | null;
  variants!: AdminTestEmailSummaryVariant[];
}
