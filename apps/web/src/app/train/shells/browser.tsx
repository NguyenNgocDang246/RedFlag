import type { ReactNode } from 'react';
import type { Span, WebScenario } from '@redflag/shared';
import { WindowControls, WindowFrame } from './frames';
import { Icon } from './icons';
import { plain, splitUrl, Spot } from './spot';
import s from './shells.module.css';

/** Chrome-style browser frame: tab strip + omnibox. */
function BrowserChrome({ url, tabTitle, children }: { url: Span; tabTitle: string; children: ReactNode }) {
  const host = splitUrl(plain(url)).host;
  return (
    <WindowFrame>
      <div className={s.chStrip}>
        <span className={s.chTab}>
          <span className={s.chFav} aria-hidden>
            {host.charAt(0).toUpperCase() || '•'}
          </span>
          <span className={s.chTabTitle}>{tabTitle || host}</span>
          <Icon name="close" size={14} color="#5f6368" />
        </span>
        <span className={s.chNewTab} aria-hidden>
          <Icon name="add" size={18} color="#3c4043" />
        </span>
        <WindowControls />
      </div>
      <div className={s.chBar}>
        <span className={s.chNav} aria-hidden>
          <Icon name="back" size={20} />
          <Icon name="fwd" size={20} color="#bdc1c6" />
          <Icon name="refresh" size={20} />
        </span>
        <span className={s.chOmni}>
          <span className={s.chSite} aria-hidden>
            <Icon name="tune" size={16} />
          </span>
          <span className={s.chUrl}>
            <Spot
              span={url}
              render={(text) => {
                const { host: h, rest } = splitUrl(text);
                return (
                  <>
                    <span className={s.chHost}>{h}</span>
                    <span className={s.chRest}>{rest}</span>
                  </>
                );
              }}
            />
          </span>
          <Icon name="star" size={18} color="#5f6368" />
        </span>
        <span className={s.chMe} aria-hidden>
          <Icon name="more" size={20} />
        </span>
      </div>
      {children}
    </WindowFrame>
  );
}

export function WebShell({ data }: { data: WebScenario }) {
  return (
    <BrowserChrome url={data.urlBar} tabTitle={data.title ?? ''}>
      <div className={s.chPage}>
        {data.title && <h2 className={s.webTitle}>{data.title}</h2>}
        {data.body.map((p, i) => (
          <p key={i} className={s.webText}>
            <Spot span={p} />
          </p>
        ))}
        {data.buttons && data.buttons.length > 0 && (
          <div className={s.webBtns}>
            {data.buttons.map((b, i) => (
              <span key={i} className={i === 0 ? s.webBtn : s.webBtnGhost}>
                <Spot span={b} />
              </span>
            ))}
          </div>
        )}
      </div>
    </BrowserChrome>
  );
}
