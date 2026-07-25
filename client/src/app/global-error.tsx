'use client';

import { useEffect } from 'react';
import { t } from '@/i18n';

/**
 * Last-resort boundary: replaces the root layout, so it must render its own
 * <html>/<body> and cannot rely on globals.css (inline styles only).
 */
export default function GlobalError({
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: '#313338',
          color: '#dbdee1',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <p style={{ fontSize: 18, fontWeight: 600 }}>{t('common.errorTitle')}</p>
        <button
          onClick={reset}
          style={{
            border: 'none',
            borderRadius: 6,
            background: '#5865f2',
            color: '#fff',
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {t('common.retry')}
        </button>
      </body>
    </html>
  );
}
