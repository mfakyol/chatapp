import { IconMessages } from '@tabler/icons-react';
import type { Translator } from '@/i18n/translate';

export function HomeFooter({ t }: { t: Translator }) {
  return (
    <footer className="border-t border-(--border) px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-(--text-muted) sm:flex-row">
        <span className="flex items-center gap-2 font-medium text-(--text-normal)">
          <IconMessages className="h-5 w-5 text-(--brand)" stroke={2} />
          {t('common.brand')}
        </span>
        <span>{t('home.footerTagline')}</span>
      </div>
    </footer>
  );
}
