'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History } from 'lucide-react';
import { IconHeading } from '@/components/icon-heading';
import { SelectInput } from '@/components/select-input';
import { errorText, listAudit, type AuditRow } from '@/lib/admin-api';
import s from '../admin.module.css';
import { useAdmin } from '../use-admin';

const LINK: Record<string, (id: string) => string> = {
  quiz: (id) => `/admin/quiz/${id}`,
  test_email: (id) => `/admin/test-emails/${id}`,
};

/** Changes via the data CLI (`pnpm --filter @redflag/api data …`) have no user — marked `via: 'cli'`. */
const viaCli = (changes: unknown) =>
  Boolean(
    changes && typeof changes === 'object' && (changes as { via?: string }).via === 'cli',
  );

export default function AdminAudit() {
  const { t, locale, href } = useAdmin();
  const ta = t.audit;
  const [entity, setEntity] = useState('');
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAudit(entity || undefined)
      .then(setRows)
      .catch((e) => setError(errorText(e)));
  }, [entity]);

  return (
    <>
      <IconHeading
        icon={History}
        title={ta.title}
        sub={ta.sub}
        className={s.pageHead}
        actions={
          <SelectInput
            size="sm"
            fit
            aria-label={ta.cols.entity}
            placeholder={ta.allTypes}
            active={Boolean(entity)}
            value={entity}
            onChange={setEntity}
            options={Object.entries(ta.entities).map(([k, v]) => ({
              value: k,
              label: v,
            }))}
          />
        }
      />

      {error && <div className={s.alert}>{error}</div>}

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>{ta.cols.time}</th>
              <th className={s.hideSm}>{ta.cols.actor}</th>
              <th>{ta.cols.action}</th>
              <th>{ta.cols.entity}</th>
              <th className={s.hideSm}>{ta.cols.details}</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((r) => {
              const link =
                r.action !== 'delete' ? LINK[r.entity]?.(r.entityId) : undefined;
              return (
                <tr key={r.id}>
                  <td className={s.small}>
                    {new Date(r.createdAt).toLocaleString(
                      locale === 'vi' ? 'vi-VN' : 'en-US',
                    )}
                  </td>
                  <td className={`${s.small} ${s.hideSm}`}>
                    {r.actor ?? (
                      <span className={s.muted}>
                        {viaCli(r.changes) ? ta.cli : ta.deletedUser}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={s.tag}>{ta.actions[r.action] ?? r.action}</span>
                  </td>
                  <td className={s.small}>
                    {ta.entities[r.entity] ?? r.entity}{' '}
                    {link ? (
                      <Link href={href(link)}>{r.entityId.slice(-8)}</Link>
                    ) : (
                      <span className={s.muted}>{r.entityId.slice(-8)}</span>
                    )}
                  </td>
                  <td className={s.hideSm}>
                    {r.changes != null && (
                      <details>
                        <summary className={`${s.small} ${s.muted}`}>{ta.view}</summary>
                        <pre className={s.pre}>{JSON.stringify(r.changes, null, 2)}</pre>
                      </details>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows?.length === 0 && <div className={s.empty}>{ta.empty}</div>}
      </div>
    </>
  );
}
