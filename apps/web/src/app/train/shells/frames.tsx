import type { ReactNode } from 'react';
import { Icon } from './icons';
import s from './shells.module.css';

/** Phone frame: bezel + status bar + home indicator. */
export function PhoneFrame({
  children,
  statusDark = false,
  statusBg,
}: {
  children: ReactNode;
  /** White status bar text (for dark headers). */
  statusDark?: boolean;
  statusBg?: string;
}) {
  return (
    <div className={s.phone}>
      <div className={s.screen}>
        <div
          className={s.status}
          style={{ background: statusBg, color: statusDark ? '#fff' : '#000' }}
        >
          <span>9:41</span>
          <span className={s.island} aria-hidden />
          <span className={s.statusIcons} aria-hidden>
            <SignalBars />
            <Icon name="wifi" size={16} />
            <Battery />
          </span>
        </div>
        {children}
        <div className={s.homeBar} aria-hidden />
      </div>
    </div>
  );
}

function SignalBars() {
  return (
    <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
      <rect x="0" y="7" width="3" height="4" rx="1" />
      <rect x="4.5" y="5" width="3" height="6" rx="1" />
      <rect x="9" y="2.5" width="3" height="8.5" rx="1" />
      <rect x="13.5" y="0" width="3" height="11" rx="1" />
    </svg>
  );
}

function Battery() {
  return (
    <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
      <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity="0.4" />
      <rect x="2" y="2" width="16" height="8" rx="1.5" fill="currentColor" />
      <rect x="23" y="4" width="1.5" height="4" rx="0.75" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

/** Empty desktop window frame (desktop apps / browser draw their own top bar). */
export function WindowFrame({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={[s.window, className ?? ''].join(' ')}>{children}</div>;
}

/** Desktop-style window controls (minimize / maximize / close). */
export function WindowControls({ light = false }: { light?: boolean }) {
  const color = light ? '#fff' : '#3c4043';
  return (
    <span className={s.winCtl} aria-hidden>
      <Icon name="minimize" size={14} color={color} />
      <Icon name="square" size={12} color={color} />
      <Icon name="close" size={14} color={color} />
    </span>
  );
}
