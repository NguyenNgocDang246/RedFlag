'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookMarked,
  Flag,
  Mail,
  FolderTree,
  History,
  LayoutDashboard,
  ListChecks,
} from 'lucide-react';
import s from './admin.module.css';
import { useAdmin } from './use-admin';

const LINKS = [
  { href: '/admin', key: 'overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/quiz', key: 'quiz', icon: ListChecks },
  { href: '/admin/categories', key: 'categories', icon: FolderTree },
  { href: '/admin/signals', key: 'signals', icon: Flag },
  { href: '/admin/brands', key: 'brands', icon: BookMarked },
  { href: '/admin/test-emails', key: 'testEmails', icon: Mail },
  { href: '/admin/audit', key: 'audit', icon: History },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const { t, href } = useAdmin();
  return (
    <>
      <div className={s.sideTitle}>{t.area}</div>
      <nav className={s.sideNav} aria-label={t.area}>
        {LINKS.map((l) => {
          const Icon = l.icon;
          const active = 'exact' in l ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={href(l.href)}
              className={`${s.sideLink} ${active ? s.sideActive : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={17} className={s.sideIcon} aria-hidden />
              {t.nav[l.key]}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
