'use client';

import { IconMessages } from '@tabler/icons-react';
import { useAuthStore } from '@/stores/auth.store';
import { useT } from '@/hooks/useT';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LocaleToggle } from '@/components/LocaleToggle';
import { LocaleLink } from '@/components/LocaleLink';
import { LinkButton } from '@/components/ui/LinkButton';

export function SiteHeader() {
  const { t } = useT();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  return (
    <header className="home-header z-10 shrink-0 border-b border-(--border)">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-3 sm:px-6">
        <LocaleLink href="/" className="flex items-center gap-2 font-semibold">
          <IconMessages className="h-6 w-6 text-(--brand)" stroke={2} />
          {t('common.brand')}
        </LocaleLink>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {!loading &&
            (user ? (
              <LinkButton href="/chat" variant="primarySm">
                {t('home.openChat')}
              </LinkButton>
            ) : (
              <>
                <LinkButton href="/login" variant="white">
                  {t('home.navLogIn')}
                </LinkButton>
                <LinkButton href="/register" variant="primarySm">
                  {t('home.navSignUp')}
                </LinkButton>
              </>
            ))}
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
