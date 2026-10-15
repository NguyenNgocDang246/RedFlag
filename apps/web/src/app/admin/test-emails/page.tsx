'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LoaderCircle, Lock, Mail, Plus, Send } from 'lucide-react';
import {
  listTestEmails,
  previewTestEmail,
  sendTestEmailToMe,
  type AdminTestEmail,
  type TestEmailPreview,
} from '@/lib/admin-api';
import { IconHeading } from '@/components/icon-heading';
import { useAdmin } from '../use-admin';
import s from '../admin.module.css';
import t2 from './test-emails.module.css';

/** Test emails (Phase 4): list, preview, send to yourself; editing lives in ./editor. */
export default function AdminTestEmailsPage() {
  const { t, href } = useAdmin();
  const tt = t.testEmails;
  const [items, setItems] = useState<AdminTestEmail[] | null>(null);
  const [preview, setPreview] = useState<TestEmailPreview | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTestEmails()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const onPreview = async (variantId: string) => {
    setError(null);
    try {
      setPreview(await previewTestEmail(variantId));
    } catch {
      setError(tt.error);
    }
  };

  const onSend = async (variantId: string) => {
    setBusyId(variantId);
    setError(null);
    setSentId(null);
    try {
      await sendTestEmailToMe(variantId);
      setSentId(variantId);
    } catch (e) {
      setError(e instanceof Error ? e.message : tt.error);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <IconHeading
        icon={Mail}
        title={tt.title}
        sub={tt.sub}
        className={s.pageHead}
        actions={
          <Link href={href('/admin/test-emails/new')} className="btn btn-primary btn-sm">
            <Plus size={16} aria-hidden /> {tt.newBtn}
          </Link>
        }
      />


      {error && <p className={s.error}>{error}</p>}

      {items === null ? (
        <LoaderCircle size={22} className={t2.spin} aria-hidden />
      ) : items.length === 0 ? (
        <p className={s.gate}>{tt.empty}</p>
      ) : (
        <ul className={t2.list}>
          {items.map((mail) => (
            <li key={mail.id} className={t2.card}>
              <div className={t2.cardHead}>
                <Mail size={18} aria-hidden />
                <span className={t2.cardTitle}>{mail.title}</span>
                <span className={t2.code}>{mail.code}</span>
                <span className={mail.status === 'published' ? t2.published : t2.draft}>
                  {mail.status === 'published' ? tt.published : tt.draft}
                </span>
                <Link href={href(`/admin/test-emails/${mail.id}`)} className="btn btn-ghost btn-sm">
                  {tt.edit}
                </Link>
              </div>

              {mail.variants.map((v) => (
                <div key={v.id} className={t2.variant}>
                  <div className={t2.variantMain}>
                    <span className={t2.subject}>{v.subject}</span>
                    <span className={t2.meta}>
                      {tt.sender}: {v.senderName || '—'} · {v.locales.join(' / ')}
                    </span>
                    <span className={t2.meta}>
                      {tt.signs}: {v.signals.join(', ') || '—'}
                    </span>
                    {v.sent > 0 && (
                      <span className={t2.meta}>
                        <Lock size={12} aria-hidden /> {tt.sentCount(v.sent)}
                      </span>
                    )}
                  </div>
                  <div className={t2.variantActions}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => void onPreview(v.id)}>
                      {tt.preview}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busyId === v.id}
                      onClick={() => void onSend(v.id)}
                    >
                      {busyId === v.id ? (
                        <LoaderCircle size={15} className={t2.spin} aria-hidden />
                      ) : (
                        <Send size={15} aria-hidden />
                      )}
                      {busyId === v.id ? tt.sending : tt.sendToMe}
                    </button>
                  </div>
                  {sentId === v.id && <p className={t2.sent}>{tt.sent}</p>}
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}

      {preview && (
        <div className={t2.previewBackdrop} role="dialog" aria-modal onClick={() => setPreview(null)}>
          <div className={t2.previewBox} onClick={(e) => e.stopPropagation()}>
            <div className={t2.previewHead}>
              <div>
                <div className={t2.previewFrom}>{preview.senderName}</div>
                <div className={t2.previewSubject}>{preview.subject}</div>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPreview(null)}>
                {tt.close}
              </button>
            </div>
            <p className={t2.meta}>{tt.previewNote}</p>
            {/* Sandboxed: the preview is rendered as its own document, with nothing granted to it. */}
            <iframe className={t2.previewFrame} sandbox="" srcDoc={preview.html} title={preview.subject} />
          </div>
        </div>
      )}
    </>
  );
}
