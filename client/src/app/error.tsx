'use client';

import { useEffect } from 'react';
import { t } from '@/i18n';

/** Route-level error boundary: keeps the app shell, offers a re-render retry. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[var(--bg-chat)] p-6">
      <p className="text-lg font-semibold text-[var(--text-normal)]">{t('common.errorTitle')}</p>
      <button
        onClick={reset}
        className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-text)] hover:bg-[var(--brand-hover)]"
      >
        {t('common.retry')}
      </button>
    </div>
  );
}
