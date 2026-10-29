/** Response shapes for auth, onboarding and test settings (Swagger docs; checked against the services by tsc). */

export class AuthProvidersResponse {
  google!: boolean;
}

export class MeTraining {
  interests!: string[];
}

export class MeTest {
  enabled!: boolean;
  frequency!: 'off' | 'low' | 'medium' | 'high';
}

export class MeResponse {
  id!: string;
  email!: string;
  name!: string | null;
  occupation!: string | null;
  servicesUsed!: string[];
  locale!: 'en' | 'vi';
  emailVerified!: boolean;
  hasPassword!: boolean;
  google!: boolean;
  role!: 'user' | 'admin';
  training!: MeTraining;
  test!: MeTest;
}

export class OnboardingTest {
  enabled!: boolean;
}

export class OnboardingResult {
  ok!: boolean;
  training!: MeTraining;
  test!: OnboardingTest;
}

export class SessionView {
  current!: boolean;
  id!: string;
  createdAt!: Date;
  userAgent!: string | null;
  lastUsedAt!: Date;
}

export class TestEnabledResponse {
  enabled!: boolean;
  frequency!: 'low' | 'medium' | 'high';
}

export class TestPausedResponse {
  enabled!: boolean;
  paused!: boolean;
}

export class TestStatusResponse {
  state!: 'off' | 'on' | 'paused';
  frequency!: 'low' | 'medium' | 'high' | null;
  stoppedReason!: 'bounced' | 'complained' | null;
}

export class TestUnsubscribedResponse {
  enabled!: boolean;
  unsubscribed!: boolean;
}

export class TestWarningResponse {
  locale!: 'en' | 'vi';
  warning!: string;
  confirmPhrase!: string;
  reportPageUrl!: string;
  reportAddress!: string;
}
