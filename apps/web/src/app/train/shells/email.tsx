import type { EmailScenario, Span } from '@redflag/shared';
import { WindowFrame } from './frames';
import { Icon, type IconName } from './icons';
import { avatarColor, plain, Spot, useShell } from './spot';
import { SKIN_T } from './strings';
import s from './shells.module.css';

/** Gmail-style webmail shell (neutral logo/name). */
export function EmailShell({ data }: { data: EmailScenario }) {
  const { locale } = useShell();
  const t = SKIN_T[locale];
  const name = plain(data.senderName);
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const atts = data.attachments ?? [];

  return (
    <WindowFrame className={s.gm}>
      {/* Top bar: menu, logo, search box, account avatar */}
      <div className={s.gmTop}>
        <span className={s.gmIconBtn}>
          <Icon name="menu" size={24} />
        </span>
        <span className={s.gmLogo}>
          <Icon name="mail" size={28} color="#d93025" />
          <span className={s.gmLogoText}>{t.mail}</span>
        </span>
        <span className={s.gmSearch}>
          <Icon name="search" size={22} />
          <span className={s.gmSearchText}>{t.searchMail}</span>
          <Icon name="tune" size={22} style={{ marginLeft: 'auto' }} />
        </span>
        <span className={s.gmMe} aria-hidden>
          Y
        </span>
      </div>

      <div className={s.gmBody}>
        {/* Collapsed sidebar */}
        <nav className={s.gmSide} aria-hidden>
          <span className={s.gmCompose}>
            <Icon name="pencil" size={22} />
          </span>
          <SideItem icon="inbox" active />
          <SideItem icon="star" />
          <SideItem icon="clock" />
          <SideItem icon="send" />
        </nav>

        <div className={s.gmMain}>
          {/* Message toolbar */}
          <div className={s.gmToolbar} aria-hidden>
            {(['back', 'archive', 'report', 'trash', 'mail', 'clock', 'more'] as IconName[]).map((n) => (
              <span key={n} className={s.gmTool}>
                <Icon name={n} size={20} />
              </span>
            ))}
          </div>

          {/* Subject + labels */}
          <div className={s.gmSubjectRow}>
            <h3 className={s.gmSubject}>
              <Spot span={data.subject} />
            </h3>
            <span className={s.gmChip}>
              {t.inbox}
              <Icon name="close" size={12} />
            </span>
          </div>

          {/* Sender */}
          <div className={s.gmSender}>
            <span className={s.gmAvatar} style={{ background: avatarColor(name) }} aria-hidden>
              {initial}
            </span>
            <div className={s.gmFrom}>
              <div className={s.gmFromLine}>
                <span className={s.gmName}>
                  <Spot span={data.senderName} />
                </span>{' '}
                <span className={s.gmAddr}>
                  &lt;
                  <Spot span={data.senderAddress} />
                  &gt;
                </span>
              </div>
              {data.to && (
                <div className={s.gmTo}>
                  {t.to} {data.to}
                  <Icon name="dropdown" size={16} />
                </div>
              )}
            </div>
            <div className={s.gmMeta}>
              {data.time && <span>{data.time}</span>}
              <span className={`${s.gmTool} ${s.gmHideNarrow}`} aria-hidden>
                <Icon name="star" size={20} />
              </span>
              <span className={s.gmTool} aria-hidden>
                <Icon name="reply" size={20} />
              </span>
              <span className={`${s.gmTool} ${s.gmHideNarrow}`} aria-hidden>
                <Icon name="more" size={20} />
              </span>
            </div>
          </div>

          {/* Body */}
          <div className={s.gmMessage}>
            {data.body.map((p, i) => (
              <p key={i}>
                <Spot span={p} />
              </p>
            ))}
          </div>

          {atts.length > 0 && (
            <div className={s.gmAtts}>
              <div className={s.gmAttsHead}>{t.attachments(atts.length)}</div>
              <div className={s.gmAttList}>
                {atts.map((a, i) => {
                  const span: Span = a.signal ? { text: a.name, signal: a.signal } : a.name;
                  return (
                    <div key={i} className={s.gmAttCard}>
                      <div className={s.gmAttPreview} aria-hidden>
                        <span className={s.gmAttPage} />
                      </div>
                      <div className={s.gmAttFoot}>
                        <FileBadge name={a.name} />
                        <span className={s.gmAttName}>
                          <Spot span={span} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={s.gmActions} aria-hidden>
            <span className={s.gmPill}>
              <Icon name="reply" size={18} />
              {t.reply}
            </span>
            <span className={s.gmPill}>
              <Icon name="forward" size={18} />
              {t.forward}
            </span>
          </div>
        </div>
      </div>
    </WindowFrame>
  );
}

function SideItem({ icon, active = false }: { icon: IconName; active?: boolean }) {
  return (
    <span className={`${s.gmNav} ${active ? s.gmNavActive : ''}`}>
      <Icon name={icon} size={20} />
    </span>
  );
}

const BADGE: Record<string, string> = {
  PDF: '#ea4335',
  DOC: '#4285f4',
  DOCX: '#4285f4',
  DOCM: '#4285f4',
  XLS: '#0f9d58',
  XLSX: '#0f9d58',
  XLSM: '#0f9d58',
  ZIP: '#5f6368',
};

function FileBadge({ name }: { name: string }) {
  const ext = name.includes('.') ? name.split('.').pop()!.toUpperCase() : 'FILE';
  return (
    <span className={s.gmBadge} style={{ background: BADGE[ext] ?? '#5f6368' }} aria-hidden>
      {ext.slice(0, 4)}
    </span>
  );
}
