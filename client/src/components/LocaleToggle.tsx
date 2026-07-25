'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LOCALE_REGISTRY } from '@/i18n/locales';
import { switchLocalePath } from '@/i18n/routing';
import { useT } from '@/hooks/useT';
import { cn } from '@/lib/cn';

export function LocaleToggle() {
  const { t, locale } = useT();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className="flex rounded-full border border-(--input-border) bg-(--input-bg) p-0.5 text-xs font-semibold"
    >
      {LOCALE_REGISTRY.map(({ code, shortLabel }) => (
        <button
          key={code}
          type="button"
          onClick={() => router.push(switchLocalePath(pathname, code))}
          aria-label={t(`common.locales.${code}`)}
          aria-pressed={locale === code}
          className={cn(
            'rounded-full px-2.5 py-1 transition',
            locale === code
              ? 'bg-(--brand) text-(--brand-text)'
              : 'text-(--text-muted) hover:text-(--text-normal)'
          )}
        >
          {shortLabel}
        </button>
      ))}
    </div>
  );
}
