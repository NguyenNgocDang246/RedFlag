import type { ReactNode } from 'react';
import type { AppScenario, FileScenario } from '@redflag/shared';
import { WindowControls, WindowFrame } from './frames';
import { Icon, type IconName } from './icons';
import { plain, Spot, useShell } from './spot';
import { SKIN_T } from './strings';
import s from './shells.module.css';

/** Permission screen laid out like an OAuth consent page (neutral account). */
export function ConsentShell({ data }: { data: AppScenario }) {
  const { locale } = useShell();
  const t = SKIN_T[locale];
  const app = <Spot span={data.appName} />;
  const initial = plain(data.appName).trim().charAt(0).toUpperCase();
  const icons: IconName[] = ['phone', 'sms', 'globe', 'person', 'lock'];

  return (
    <WindowFrame className={s.ocBg}>
      <div className={s.ocCard}>
        <div className={s.ocTop}>
          <Icon name="person" size={18} color="#444746" />
          {t.signInWith}
        </div>
        <div className={s.ocLogo} aria-hidden>
          {initial}
        </div>
        <h3 className={s.ocTitle}><Around pair={t.wantsAccess} app={app} /></h3>
        <span className={s.ocAccount} aria-hidden>
          <span className={s.ocAccountDot}>Y</span>
          you@example.com
          <Icon name="dropdown" size={18} />
        </span>
        {data.publisher && (
          <p className={s.ocPublisher}>
            <Spot span={data.publisher} />
          </p>
        )}
        <p className={s.ocAllow}><Around pair={t.willAllow} app={app} /></p>
        <ul className={s.ocList}>
          {data.permissions.map((p, i) => (
            <li key={i}>
              <span className={s.ocPermIcon} aria-hidden>
                <Icon name={icons[i % icons.length]} size={18} color="#0b57d0" />
              </span>
              <span className={s.ocPermText}>
                <Spot span={p} />
              </span>
              <Icon name="info" size={18} color="#444746" />
            </li>
          ))}
        </ul>
        <p className={s.ocTrustHead}><Around pair={t.trust} app={app} /></p>
        <p className={s.ocTrust}>{t.trustNote}</p>
        <div className={s.ocBtns} aria-hidden>
          <span className={s.ocCancel}>{t.cancel}</span>
          <span className={s.ocOk}>{t.allow}</span>
        </div>
      </div>
    </WindowFrame>
  );
}

/** Inserts the app name into a translated sentence: [before, after]. */
function Around({ pair, app }: { pair: readonly [string, string] | string[]; app: ReactNode }) {
  return (
    <>
      {pair[0]}
      {app}
      {pair[1]}
    </>
  );
}

/** Document open in a Word-style editor, with a macro warning bar. */
export function FileShell({ data }: { data: FileScenario }) {
  const { locale } = useShell();
  const t = SKIN_T[locale];
  return (
    <WindowFrame>
      <div className={s.wdTitle}>
        <span className={s.wdLogo} aria-hidden>
          W
        </span>
        <span className={s.wdName}>
          <Spot span={data.fileName} />
        </span>
        <WindowControls light />
      </div>
      <div className={s.wdTabs} aria-hidden>
        {t.wordTabs.map((tab, i) => (
          <span key={tab} className={i === 1 ? s.wdTabOn : undefined}>
            {tab}
          </span>
        ))}
      </div>
      <div className={s.wdWarn}>
        <Icon name="shield" size={18} color="#a4262c" />
        <b>{t.securityWarning}</b>
        <span>{t.macrosDisabled}</span>
        <span className={s.wdEnable}>{data.prompt ?? t.enableContent}</span>
        <Icon name="close" size={16} color="#605e5c" style={{ marginLeft: 'auto' }} />
      </div>
      <div className={s.wdCanvas}>
        <div className={s.wdPage}>
          {data.body && data.body.length > 0 ? (
            data.body.map((p, i) => (
              <p key={i}>
                <Spot span={p} />
              </p>
            ))
          ) : (
            <div aria-hidden>
              <div className={s.skeleton} style={{ width: '70%' }} />
              <div className={s.skeleton} style={{ width: '90%' }} />
              <div className={s.skeleton} style={{ width: '55%' }} />
            </div>
          )}
        </div>
      </div>
    </WindowFrame>
  );
}
