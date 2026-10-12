'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  MailWarning,
  Menu,
  ShieldCheck,
  TrendingUp,
  UserPen,
  X,
} from 'lucide-react';
import { useLocale } from '@/components/site-header';
import { ME_T } from '@/lib/i18n';
import s from './me.module.css';

const LINKS = [
  { href: '/me', key: 'progress', icon: TrendingUp },
  { href: '/me/profile', key: 'profile', icon: UserPen },
  { href: '/me/test', key: 'test', icon: MailWarning },
  { href: '/me/account', key: 'account', icon: ShieldCheck },
] as const;

/** Section list. Wide screens: a sidebar. Phones: a ☰ button showing the current section, opening the list. */
export function MeNav({ name, email }: { name: string | null; email: string }) {
  const locale = useLocale();
  const t = ME_T[locale];
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = LINKS.find((l) => l.href === pathname) ?? LINKS[0];
  const CurrentIcon = current.icon;

  // Close the phone menu after navigating.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <div className={s.who}>
        <span className={s.avatar} aria-hidden>
          {(name || email).charAt(0).toUpperCase()}
        </span>
        <span className={s.whoText}>
          <span className={s.whoName}>{name || t.title}</span>
          <span className={s.whoEmail}>{email}</span>
        </span>
      </div>

      <button
        type="button"
        className={s.menuBtn}
        aria-expanded={open}
        aria-controls="me-nav"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        <CurrentIcon size={18} className={s.navIcon} aria-hidden />
        <span className={s.menuLabel}>{t.nav[current.key]}</span>
        <ChevronDown
          size={18}
          className={`${s.menuChevron} ${open ? s.menuChevronOpen : ''}`}
          aria-hidden
        />
      </button>

      <nav
        id="me-nav"
        className={`${s.nav} ${open ? s.navOpen : ''}`}
        aria-label={t.title}
      >
        {LINKS.map((l) => {
          const Icon = l.icon;
          const active = l.href === current.href;
          return (
            <Link
              key={l.href}
              href={`${l.href}?locale=${locale}`}
              className={`${s.navLink} ${active ? s.navActive : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} className={s.navIcon} aria-hidden />
              {t.nav[l.key]}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
