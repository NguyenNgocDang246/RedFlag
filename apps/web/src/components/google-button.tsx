import { googleSignInUrl, type Locale } from '@/lib/api';
import { AUTH_T } from '@/lib/i18n';
import s from './auth.module.css';

/** Google's own mark — brand icons aren't in lucide, and it must look like Google's. */
function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.6h12c-.2 2-1.5 5-4.4 7l6.7 5.2c4-3.7 6.8-9.1 6.8-15.8z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.9 0 10.9-2 14.3-5.3l-6.7-5.2c-1.9 1.3-4.4 2.2-7.6 2.2-5.9 0-10.8-3.9-12.6-9.2l-7 5.4C7.8 41 15.3 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.4 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7-5.4C3.5 17.1 2.6 20.4 2.6 24s.9 6.9 2.4 9.9l7-5.4z"
      />
      <path
        fill="#EA4335"
        d="M24 10.3c4.2 0 7 1.8 8.6 3.3l6-5.8C34.9 4.3 29.9 2 24 2 15.3 2 7.8 7 4.9 14.1l7 5.4C13.7 14.2 18.6 10.3 24 10.3z"
      />
    </svg>
  );
}

/**
 * Starts Google sign-in. A plain link, not a fetch: the browser has to leave for Google and come
 * back to the API, which sets the session cookies before sending it on into the app.
 */
export function GoogleButton({ locale, next }: { locale: Locale; next?: string }) {
  return (
    <>
      <a className={s.google} href={googleSignInUrl(locale, next)}>
        <GoogleG />
        {AUTH_T[locale].googleBtn}
      </a>
      <div className={s.divider}>{AUTH_T[locale].orDivider}</div>
    </>
  );
}
