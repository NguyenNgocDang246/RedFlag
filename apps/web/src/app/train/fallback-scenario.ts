import { QuizKind, type ScenarioData } from '@redflag/shared';

/**
 * Safety net: a quiz missing `scenarioData` must still render in a simulated shell (R10),
 * never a plain text box. Builds a minimal shell for the quiz kind from the `scenario` text.
 * (Seed already requires scenarioData — this only guards legacy/hand-entered data.)
 */
export function fallbackScenario(kind: string, text: string): ScenarioData {
  switch (kind) {
    case QuizKind.WEB_INSPECTION:
    case QuizKind.POPUP:
      return { urlBar: 'https://', body: [text] };
    case QuizKind.EMAIL_INSPECTION:
      return { senderName: 'Mail', senderAddress: 'no-reply@mail.example', subject: '', body: [text] };
    case QuizKind.CHAT_INSPECTION:
      return { contactName: 'Chat', bubbles: [{ from: 'them', text }] };
    case QuizKind.QR_INSPECTION:
      return { decodedUrl: text };
    case QuizKind.FILE_INSPECTION:
      return { fileName: 'document.docx', body: [text] };
    case QuizKind.APP_CONSENT:
    case QuizKind.OAUTH_CONSENT:
      return { appName: 'App', permissions: [text] };
    case QuizKind.SMS_INSPECTION:
    default:
      return { sender: 'SMS', messages: [text] };
  }
}

/** Shell kind to render: popup has no shell yet → browser; unknown kinds → SMS (matches fallbackScenario). */
export function shellKind(kind: string): string {
  if (kind === QuizKind.POPUP) return QuizKind.WEB_INSPECTION;
  return (Object.values(QuizKind) as string[]).includes(kind) ? kind : QuizKind.SMS_INSPECTION;
}
