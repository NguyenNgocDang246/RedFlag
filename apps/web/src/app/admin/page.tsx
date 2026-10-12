'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookMarked,
  CircleAlert,
  Flag,
  FolderTree,
  History,
  LayoutDashboard,
  ListChecks,
  NotebookPen,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import { IconHeading } from '@/components/icon-heading';
import {
  errorText,
  listAudit,
  listBrands,
  listCategories,
  listQuiz,
  listSignals,
  type AdminQuizListItem,
  type AuditRow,
} from '@/lib/admin-api';
import s from './admin.module.css';
import { useAdmin } from './use-admin';

interface Overview {
  published: number;
  drafts: number;
  draftItems: AdminQuizListItem[];
  categories: number;
  signals: number;
  brands: number;
  recent: AuditRow[];
}

/** Admin landing: content counts, drafts that still have issues, latest changes. */
export default function AdminOverview() {
  const { t, locale, href } = useAdmin();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      listQuiz({ status: 'published', page: 1 }),
      listQuiz({ status: 'draft', page: 1 }),
      listCategories(),
      listSignals(),
      listBrands(),
      listAudit(),
    ])
      .then(([pub, drafts, cats, sigs, brands, audit]) =>
        setData({
          published: pub.total,
          drafts: drafts.total,
          draftItems: drafts.items,
          categories: cats.length,
          signals: sigs.length,
          brands: brands.length,
          recent: audit.slice(0, 8),
        }),
      )
      .catch((e) => setError(errorText(e)));
  }, []);

  const o = t.overview;
  const withIssues = data?.draftItems.filter((q) => q.issueCount > 0) ?? [];
  const title = (q: AdminQuizListItem) =>
    q.title[locale] || q.title.en || q.title.vi || q.prompt[locale] || `#${q.number}`;

  return (
    <>
      <IconHeading
        icon={LayoutDashboard}
        title={o.title}
        sub={o.sub}
        className={s.pageHead}
      />

      {error && <div className={s.alert}>{error}</div>}

      <div className={s.quick}>
        <Link href={href('/admin/quiz/new')} className="btn btn-primary btn-sm">
          <Plus size={16} aria-hidden /> {o.newQuiz}
        </Link>
        <Link href={href('/admin/quiz')} className="btn btn-secondary btn-sm">
          <NotebookPen size={16} aria-hidden /> {o.reviewDrafts}
        </Link>
      </div>

      <div className={s.stats}>
        <Stat
          icon={ListChecks}
          label={o.published}
          value={data?.published}
          to={href('/admin/quiz')}
        />
        <Stat
          icon={NotebookPen}
          label={o.drafts}
          value={data?.drafts}
          to={href('/admin/quiz')}
        />
        <Stat
          icon={CircleAlert}
          label={o.needsWork}
          value={data ? withIssues.length : undefined}
          to={href('/admin/quiz')}
          warn={withIssues.length > 0}
        />
        <Stat
          icon={FolderTree}
          label={o.categories}
          value={data?.categories}
          to={href('/admin/categories')}
        />
        <Stat
          icon={Flag}
          label={o.signals}
          value={data?.signals}
          to={href('/admin/signals')}
        />
        <Stat
          icon={BookMarked}
          label={o.brands}
          value={data?.brands}
          to={href('/admin/brands')}
        />
      </div>

      <div className={s.panels}>
        <section className={s.panel}>
          <IconHeading
            icon={CircleAlert}
            size="card"
            title={o.attention}
            className={s.panelHead}
          />
          {!data ? (
            <p className={s.muted}>{t.common.loading}</p>
          ) : withIssues.length === 0 ? (
            <p className={s.muted}>{o.allGood}</p>
          ) : (
            <ul className={s.list}>
              {withIssues.map((q) => (
                <li key={q.id} className={s.listItem}>
                  <span className={s.muted}>#{q.number}</span>
                  <span className={s.listMain}>
                    <Link href={href(`/admin/quiz/${q.id}`)}>{title(q)}</Link>
                  </span>
                  <span className={`${s.tag} ${s.tagIssue}`}>
                    {o.issues(q.issueCount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={s.panel}>
          <IconHeading
            icon={History}
            size="card"
            title={o.recent}
            className={s.panelHead}
            actions={
              <Link href={href('/admin/audit')} className="btn btn-ghost btn-sm">
                {o.viewAll}
              </Link>
            }
          />
          {!data ? (
            <p className={s.muted}>{t.common.loading}</p>
          ) : data.recent.length === 0 ? (
            <p className={s.muted}>{o.noRecent}</p>
          ) : (
            <ul className={s.list}>
              {data.recent.map((r) => (
                <li key={r.id} className={s.listItem}>
                  <span className={s.tag}>{t.audit.actions[r.action] ?? r.action}</span>
                  <span className={s.listMain}>
                    {t.audit.entities[r.entity] ?? r.entity}{' '}
                    {r.entity === 'quiz' && r.action !== 'delete' ? (
                      <Link href={href(`/admin/quiz/${r.entityId}`)}>
                        {r.entityId.slice(-8)}
                      </Link>
                    ) : (
                      <span className={s.muted}>{r.entityId.slice(-8)}</span>
                    )}
                    {r.actor && <span className={s.muted}> · {r.actor}</span>}
                  </span>
                  <span className={`${s.small} ${s.muted}`}>
                    {new Date(r.createdAt).toLocaleDateString(
                      locale === 'vi' ? 'vi-VN' : 'en-US',
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  to,
  warn,
}: {
  icon: LucideIcon;
  label: string;
  value: number | undefined;
  to: string;
  warn?: boolean;
}) {
  return (
    <Link href={to} className={`${s.stat} ${warn ? s.statWarn : ''}`}>
      <span className={s.statHead}>
        <Icon size={16} className={s.sideIcon} aria-hidden />
        {label}
      </span>
      <span className={s.statValue}>{value ?? '—'}</span>
    </Link>
  );
}
