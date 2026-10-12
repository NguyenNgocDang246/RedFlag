import {
  AppWindow,
  KeyRound,
  FileText,
  Globe,
  Mail,
  MessageSquare,
  MessagesSquare,
  PanelTop,
  QrCode,
  type LucideIcon,
} from 'lucide-react';

/** Icon per scenario kind (channel). */
export const KIND_ICON: Record<string, LucideIcon> = {
  email_inspection: Mail,
  web_inspection: Globe,
  sms_inspection: MessageSquare,
  chat_inspection: MessagesSquare,
  qr_inspection: QrCode,
  file_inspection: FileText,
  app_consent: AppWindow,
  oauth_consent: KeyRound,
  popup: PanelTop,
};

export function KindIcon({ kind, size = 16 }: { kind: string; size?: number }) {
  const Icon = KIND_ICON[kind] ?? Globe;
  return <Icon size={size} aria-hidden />;
}
