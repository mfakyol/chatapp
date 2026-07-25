'use client';

import { LocaleLink } from '@/components/LocaleLink';
import { useT } from '@/hooks/useT';

export default function LocaleNotFound() {
  const { t } = useT();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <p className="text-lg font-semibold">{t('common.errorTitle')}</p>
      <LocaleLink
        href="/"
        className="rounded-full bg-(--brand) px-4 py-2 text-sm font-medium text-(--brand-text)"
      >
        {t('common.brand')}
      </LocaleLink>
    </div>
  );
}
