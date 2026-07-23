'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import { t } from '@/i18n';

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-lg bg-[var(--bg-surface)] p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-[var(--text-normal)]">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
          >
            {t('common.cancel')}
          </button>
          <button
            autoFocus
            onClick={onConfirm}
            className="rounded-md bg-[var(--danger)] px-3 py-1.5 text-sm font-medium text-white"
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Promise-based confirmation, replacing `window.confirm` (blocking, unthemed).
 * Usage: `const { confirm, confirmDialog } = useConfirm();` — render
 * `{confirmDialog}` once, then `if (!(await confirm('...'))) return;`.
 */
export function useConfirm(): {
  confirm: (message: string) => Promise<boolean>;
  confirmDialog: ReactNode;
} {
  const [pending, setPending] = useState<{
    message: string;
    resolve: (ok: boolean) => void;
  } | null>(null);

  const confirm = useCallback(
    (message: string) => new Promise<boolean>((resolve) => setPending({ message, resolve })),
    []
  );

  const confirmDialog = pending ? (
    <ConfirmDialog
      message={pending.message}
      onConfirm={() => {
        pending.resolve(true);
        setPending(null);
      }}
      onCancel={() => {
        pending.resolve(false);
        setPending(null);
      }}
    />
  ) : null;

  return { confirm, confirmDialog };
}
