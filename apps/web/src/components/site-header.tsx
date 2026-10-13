'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  Library,
  Lock,
  LogOut,
  ShieldCheck,
  Swords,
  Target,
  UserRound,
} from 'lucide-react';
import { logout, restoreSession, type Locale, type Me } from '@/lib/api';
import { NAV_T } from '@/lib/i18n';
import { LocaleSwitch } from './locale-switch';
import { Logo } from './logo';
import s from './site.module.css';

/** Current language from ?locale= (same as other pages). */
export function useLocale(): Locale {
  return useSearchParams().get('locale') === 'vi' ? 'vi' : 'en';
}

/**
 * Shared header. `initialMe` is server-rendered (no UI flash);
 * if the server saw no user (expired access token), the client tries refresh exactly once.
 */
/**
 * Pages that render as a full-screen moment of their own, with no site chrome around them.
 * `/caught` is where a click on a simulated test email lands.
 */
const BARE_ROUTES = ['/caught'];
const isBareRoute = (pathname: string) => BARE_ROUTES.some((r) => pathname.startsWith(r));
/** Admin uses a wider frame; header and footer widen with it so their edges line up. */
const isWideRoute = (pathname: string) => pathname.startsWith('/admin');

export function SiteHeader({ initialMe }: { initialMe: Me | null }) {
  const locale = useLocale();
  const t = NAV_T[locale];
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(initialMe);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (initialMe) {
      setMe(initialMe);
      return;
    }
    let alive = true;
    restoreSession()
      .then((u) => alive && setMe(u))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [initialMe]);

  // Close the menu on outside click or Esc.
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const q = `?locale=${locale}`;
  const onLogout = async () => {
    setMenuOpen(false);
    await logout().catch(() => {});
    setMe(null);
    router.push(`/${q}`);
    router.refresh();
  };
  const initial = me ? (me.name || me.email).charAt(0).toUpperCase() : '';
  // Break a long email before the "@" rather than mid-word.
  const at = me ? me.email.indexOf('@') : -1;

  if (isBareRoute(pathname)) return null;

  return (
    <header className={s.header}>
      <div className={`${s.inner} ${isWideRoute(pathname) ? s.wide : ''}`}>
        <Link href={`/${q}`} className={s.brand} aria-label="RedFlag">
          <Logo />
        </Link>

        <nav className={s.nav}>
          <Link
            href={`/practice${q}`}
            className={`${s.navLink} ${/^\/(practice|train)/.test(pathname) ? s.navActive : ''}`}
          >
            <Target size={17} className={s.navIcon} aria-hidden />
            {t.practice}
          </Link>
          <Link
            href={`/library${q}`}
            className={`${s.navLink} ${pathname.startsWith('/library') ? s.navActive : ''}`}
          >
            <Library size={17} className={s.navIcon} aria-hidden />
            {t.library}
          </Link>
          <Link
            href={`/contest${q}`}
            className={`${s.navLink} ${pathname.startsWith('/contest') ? s.navActive : ''}`}
          >
            <Swords size={17} className={s.navIcon} aria-hidden />
            {t.contest}
          </Link>
          {me?.role === 'admin' && (
            <Link
              href={`/admin${q}`}
              className={`${s.navLink} ${pathname.startsWith('/admin') ? s.navActive : ''}`}
            >
              <ShieldCheck size={17} className={s.navIcon} aria-hidden />
              {t.admin}
            </Link>
          )}
        </nav>

        <div className={s.right}>
          <LocaleSwitch current={locale} />
          {me ? (
            <div className={s.userBox} ref={boxRef}>
              <button
                type="button"
                className={s.userBtn}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <span className={s.avatar}>{initial}</span>
                <ChevronDown size={16} aria-hidden />
              </button>
              {menuOpen && (
                <div className={s.menu} role="menu">
                  <div className={s.menuHead}>
                    <span className={s.avatarLg}>{initial}</span>
                    <span className={s.menuEmail} title={me.email}>
                      {at > 0 ? (
                        <>
                          {me.email.slice(0, at)}
                          <wbr />
                          {me.email.slice(at)}
                        </>
                      ) : (
                        me.email
                      )}
                    </span>
                  </div>
                  <Link
                    href={`/me${q}`}
                    role="menuitem"
                    className={`${s.menuItem} ${s.menuLink}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <UserRound size={18} aria-hidden />
                    {t.me}
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className={s.menuItem}
                    onClick={onLogout}
                  >
                    <LogOut size={18} aria-hidden />
                    {t.logout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href={`/login${q}`} className={`btn btn-ghost btn-sm ${s.loginLink}`}>
                {t.login}
              </Link>
              <Link
                href={`/register${q}`}
                className={`btn btn-primary btn-sm ${s.registerBtn}`}
              >
                {t.register}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ me }: { me: Me | null }) {
  const pathname = usePathname();
  const locale = useLocale();
  if (isBareRoute(pathname)) return null;
  const t = NAV_T[locale];
  const q = `?locale=${locale}`;
  return (
    <footer className={s.footer}>
      <div className={`${s.footInner} ${isWideRoute(pathname) ? s.wide : ''}`}>
        <span className={s.footBrand}>
          <Logo />
          <span className={s.copy}>© {new Date().getFullYear()}</span>
        </span>
        <span className={s.privacy}>
          <Lock size={13} aria-hidden />
          {t.privacy}
        </span>
        <nav className={s.footLinks}>
          <Link href={`/practice${q}`}>{t.practice}</Link>
          <Link href={`/library${q}`}>{t.library}</Link>
          <Link href={`/contest${q}`}>{t.contest}</Link>
          <Link href={`/handbook${q}`}>{t.handbook}</Link>
          <Link href={`/report${q}`}>{t.report}</Link>
          {!me && (
            <>
              <Link href={`/login${q}`}>{t.login}</Link>
              <Link href={`/register${q}`}>{t.register}</Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  );
}
