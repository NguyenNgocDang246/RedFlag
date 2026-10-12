'use client';

import type { ReactNode } from 'react';
import {
  QuizKind,
  type AppScenario,
  type ChatScenario,
  type EmailScenario,
  type FileScenario,
  type QrScenario,
  type SmsScenario,
  type WebScenario,
} from '@redflag/shared';
import type { Locale } from '@/lib/api';
import { WebShell } from './browser';
import { ConsentShell, FileShell } from './desktop-apps';
import { EmailShell } from './email';
import { ChatShell, InstallShell, QrShell, SmsShell } from './phone';
import { SpotContext, type Reveal } from './spot';
import s from './shells.module.css';

export type { Reveal };
export { signalOfKey, signalsOf, spotKey } from './spot';

export interface ShellProps {
  kind: string;
  data: unknown;
  /** Selected hotspot keys (spotKey). */
  selected: string[];
  onToggle: (key: string) => void;
  locked: boolean;
  locale: Locale;
  /** Present after grading: marks correct / missed / wrong hotspots right on the shell. */
  reveal?: Reveal;
}

/**
 * Per-channel simulated shell, built like the real app (layout/colors/interaction) with neutral logos.
 * Hotspots have no visual cue before being tapped (see Spot).
 * Returns null if the kind has no shell (the caller falls back).
 */
export function ScenarioShell({ kind, data, selected, onToggle, locked, locale, reveal }: ShellProps) {
  if (!data) return null;
  const body = renderSkin(kind, data);
  if (!body) return null;
  return (
    <SpotContext.Provider value={{ selected, onToggle, locked, reveal, locale }}>
      <div className={s.wrap}>
        {body}
      </div>
    </SpotContext.Provider>
  );
}

function renderSkin(kind: string, data: unknown): ReactNode {
  switch (kind) {
    case QuizKind.EMAIL_INSPECTION:
      return <EmailShell data={data as EmailScenario} />;
    case QuizKind.WEB_INSPECTION:
      return <WebShell data={data as WebScenario} />;
    case QuizKind.SMS_INSPECTION:
      return <SmsShell data={data as SmsScenario} />;
    case QuizKind.CHAT_INSPECTION:
      return <ChatShell data={data as ChatScenario} />;
    case QuizKind.QR_INSPECTION:
      return <QrShell data={data as QrScenario} />;
    case QuizKind.FILE_INSPECTION:
      return <FileShell data={data as FileScenario} />;
    case QuizKind.APP_CONSENT:
      return <InstallShell data={data as AppScenario} />;
    case QuizKind.OAUTH_CONSENT:
      return <ConsentShell data={data as AppScenario} />;
    default:
      return null;
  }
}
