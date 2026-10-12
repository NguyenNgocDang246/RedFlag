import s from './site.module.css';

/** Wordmark + flag icon (SVG, matches the favicon). */
export function Logo() {
  return (
    <span className={s.logo}>
      <span className={s.logoMark} aria-hidden>
        <svg viewBox="0 0 32 32" width="18" height="18">
          <rect x="7" y="4" width="3" height="25" rx="1.5" fill="#fff" />
          <path d="M10 5h15l-4 6 4 6H10z" fill="#fff" />
        </svg>
      </span>
      RedFlag
    </span>
  );
}
