'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import s from './confirm-dialog.module.css';

export interface ConfirmOptions {
  /** Text of the confirming button. */
  confirmLabel: string;
  cancelLabel: string;
  /** Destructive action: the confirming button is red. */
  danger?: boolean;
}

interface Pending extends ConfirmOptions {
  message: string;
  resolve: (ok: boolean) => void;
}

/**
 * In-page replacement for `window.confirm` (styled, localized, keyboard friendly).
 *
 *   const { ask, dialog } = useConfirm();
 *   if (!(await ask(t.confirmDelete, { confirmLabel: t.delete, cancelLabel: t.cancel, danger: true }))) return;
 *   …
 *   return <>{…}{dialog}</>;
 */
export function useConfirm(): {
  ask: (message: string, opts: ConfirmOptions) => Promise<boolean>;
  dialog: ReactNode;
} {
  const [pending, setPending] = useState<Pending | null>(null);

  const ask = useCallback(
    (message: string, opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ message, ...opts, resolve })),
    [],
  );

  const close = useCallback(
    (ok: boolean) =>
      setPending((p) => {
        p?.resolve(ok);
        return null;
      }),
    [],
  );

  return { ask, dialog: pending ? <ConfirmDialog pending={pending} onClose={close} /> : null };
}

function ConfirmDialog({ pending, onClose }: { pending: Pending; onClose: (ok: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  // showModal: top layer, focus kept inside, Esc fires `cancel`. Focus returns to the opener on close.
  useEffect(() => {
    const el = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    el?.showModal();
    return () => {
      if (el?.open) el.close();
      opener?.focus?.();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-describedby="confirm-dialog-message"
      onCancel={(e) => {
        e.preventDefault();
        onClose(false);
      }}
      // A click on the backdrop lands on the <dialog> itself, not on its content.
      onClick={(e) => e.target === e.currentTarget && onClose(false)}
    >
      <div className={s.box}>
        <p id="confirm-dialog-message" className={s.message}>
          {pending.message}
        </p>
        <div className={s.actions}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onClose(false)}>
            {pending.cancelLabel}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${pending.danger ? s.danger : 'btn-primary'}`}
            onClick={() => onClose(true)}
            autoFocus
          >
            {pending.confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
