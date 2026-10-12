import type { AppScenario, ChatScenario, QrScenario, SmsScenario } from '@redflag/shared';
import { PhoneFrame } from './frames';
import { Icon } from './icons';
import { linkify, plain, splitUrl, Spot, useShell } from './spot';
import { SKIN_T } from './strings';
import s from './shells.module.css';

/** SMS laid out like iOS Messages. */
export function SmsShell({ data }: { data: SmsScenario }) {
  const { locale } = useShell();
  const t = SKIN_T[locale];
  return (
    <PhoneFrame statusBg="#f6f6f6">
      <div className={s.iosHead}>
        <span className={s.iosBack} aria-hidden>
          <Icon name="chevronLeft" size={30} color="#007aff" />
        </span>
        <span className={s.iosContact}>
          <span className={s.iosAvatar} aria-hidden>
            <Icon name="person" size={30} color="#fff" />
          </span>
          <span className={s.iosName}>
            <Spot span={data.sender} />
            <Icon name="chevronRight" size={12} color="#8e8e93" />
          </span>
        </span>
      </div>
      <div className={s.iosThread}>
        <div className={s.iosStamp}>
          {t.textMessage}
          <br />
          {t.today} 9:41
        </div>
        {data.messages.map((m, i) => (
          <div key={i} className={s.iosBubble}>
            <Spot span={m} render={(text) => linkify(text, s.iosLink)} />
          </div>
        ))}
      </div>
      <div className={s.iosInput} aria-hidden>
        <span className={s.iosPlus}>
          <Icon name="add" size={20} color="#8e8e93" />
        </span>
        <span className={s.iosField}>
          {t.textMessage}
          <Icon name="mic" size={18} color="#8e8e93" />
        </span>
      </div>
    </PhoneFrame>
  );
}

/** WhatsApp-style chat (no brand logo/name). */
export function ChatShell({ data }: { data: ChatScenario }) {
  const { locale } = useShell();
  const t = SKIN_T[locale];
  const name = plain(data.contactName);
  return (
    <PhoneFrame statusDark statusBg="#008069">
      <div className={s.waHead}>
        <Icon name="back" size={22} color="#fff" />
        <span className={s.waAvatar} aria-hidden>
          {name.trim().charAt(0).toUpperCase()}
        </span>
        <span className={s.waWho}>
          <span className={s.waName}>
            <Spot span={data.contactName} />
          </span>
          <span className={s.waOnline}>{t.online}</span>
        </span>
        <span className={s.waIcons} aria-hidden>
          <Icon name="video" size={22} color="#fff" />
          <Icon name="call" size={20} color="#fff" />
          <Icon name="more" size={22} color="#fff" />
        </span>
      </div>
      <div className={s.waThread}>
        <div className={s.waDay}>{t.todayCaps}</div>
        {data.bubbles.map((b, i) => (
          <div key={i} className={b.from === 'me' ? s.waMe : s.waThem}>
            <Spot span={b.text} render={(text) => linkify(text, s.waLink)} />
            <span className={s.waTime} aria-hidden>
              9:{String(38 + i).padStart(2, '0')}
              {b.from === 'me' && <Icon name="doneAll" size={16} color="#53bdeb" />}
            </span>
          </div>
        ))}
      </div>
      <div className={s.waInput} aria-hidden>
        <span className={s.waField}>
          <Icon name="emoji" size={22} color="#8696a0" />
          <span className={s.waPlaceholder}>{t.message}</span>
          <Icon name="attach" size={22} color="#8696a0" style={{ transform: 'rotate(-45deg)' }} />
          <Icon name="camera" size={22} color="#8696a0" />
        </span>
        <span className={s.waMic}>
          <Icon name="mic" size={22} color="#fff" />
        </span>
      </div>
    </PhoneFrame>
  );
}

/** Phone camera scanning a QR code, iOS Camera style. */
export function QrShell({ data }: { data: QrScenario }) {
  const { locale } = useShell();
  const t = SKIN_T[locale];
  return (
    <PhoneFrame statusDark statusBg="#000">
      <div className={s.camView}>
        <div className={s.camPoster}>
          {data.posterText && (
            <div className={s.camPosterText}>
              <Spot span={data.posterText} />
            </div>
          )}
          <div className={s.camQrWrap}>
            <QrArt seed={plain(data.decodedUrl)} />
            <span className={`${s.camCorner} ${s.tl}`} />
            <span className={`${s.camCorner} ${s.tr}`} />
            <span className={`${s.camCorner} ${s.bl}`} />
            <span className={`${s.camCorner} ${s.br}`} />
          </div>
        </div>
        <div className={s.camPill}>
          <Icon name="globe" size={18} color="#1c1c1e" />
          <span className={s.camPillText}>
            <span className={s.camPillSmall}>{t.websiteQr}</span>
            <Spot span={data.decodedUrl} render={(text) => splitUrl(text).host + splitUrl(text).rest} />
          </span>
        </div>
      </div>
      <div className={s.camBar} aria-hidden>
        <div className={s.camModes}>
          <span>{t.video}</span>
          <span className={s.camModeOn}>{t.photo}</span>
        </div>
        <div className={s.camControls}>
          <span className={s.camThumb} />
          <span className={s.camShutter} />
          <span className={s.camFlip}>
            <Icon name="refresh" size={22} color="#fff" />
          </span>
        </div>
      </div>
    </PhoneFrame>
  );
}

/** Decorative QR code (encodes no real data — just looks like one). */
function QrArt({ seed }: { seed: string }) {
  const n = 25;
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
  const cells: [number, number][] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inFinder(x, y) && rand() < 0.5) cells.push([x, y]);
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={7} height={7} fill="#000" />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill="#000" />
    </g>
  );
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} className={s.camQr} shapeRendering="crispEdges" aria-hidden>
      <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="#fff" />
      {cells.map(([x, y]) => (
        <rect key={`${x}.${y}`} x={x} y={y} width={1} height={1} fill="#000" />
      ))}
      {finder(0, 0)}
      {finder(n - 7, 0)}
      {finder(0, n - 7)}
    </svg>
  );
}

/**
 * Android package installer for a sideloaded APK (legacy screen that lists permissions up front).
 * `publisher` renders as the Play Protect notice a real phone shows for unknown apps.
 */
export function InstallShell({ data }: { data: AppScenario }) {
  const { locale } = useShell();
  const t = SKIN_T[locale];
  const initial = plain(data.appName).trim().charAt(0).toUpperCase();
  const icons = ['sms', 'phone', 'person', 'globe', 'lock'] as const;

  return (
    <PhoneFrame statusBg="#f3f3f8">
      <div className={s.apk}>
        <div className={s.apkHead}>
          <span className={s.apkIcon} aria-hidden>
            {initial}
          </span>
          <span className={s.apkName}>
            <Spot span={data.appName} />
          </span>
        </div>
        {data.publisher && (
          <div className={s.apkProtect}>
            <Icon name="shield" size={18} color="#b3261e" />
            <span>
              <Spot span={data.publisher} />
            </span>
          </div>
        )}
        <p className={s.apkAsk}>{t.installAsk}</p>
        <ul className={s.apkList}>
          {data.permissions.map((p, i) => (
            <li key={i}>
              <Icon name={icons[i % icons.length]} size={18} color="#5f6368" />
              <span>
                <Spot span={p} />
              </span>
            </li>
          ))}
        </ul>
        <div className={s.apkBtns} aria-hidden>
          <span>{t.installCancel}</span>
          <span>{t.install}</span>
        </div>
      </div>
    </PhoneFrame>
  );
}
