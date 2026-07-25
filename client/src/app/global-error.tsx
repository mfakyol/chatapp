'use client';

import { useEffect } from 'react';
import { t } from '@/i18n';


const tokens = {
  bgChat: '#313338',
  textNormal: '#dbdee1',
  brand: '#5865f2',
  brandText: '#ffffff',
} as const;


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
          background: tokens.bgChat,
          color: tokens.textNormal,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <p style={{ fontSize: 18, fontWeight: 600 }}>{t('common.errorTitle')}</p>
        <button
          onClick={reset}
          style={{
            border: 'none',
            borderRadius: 6,
            background: tokens.brand,
            color: tokens.brandText,
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
