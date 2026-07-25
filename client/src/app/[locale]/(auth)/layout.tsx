'use client';

import { usePathname } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { AuthCard } from '@/components/ui/AuthCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { HomeFooter } from '@/components/home/HomeFooter';
import { useAuthStore } from '@/stores/auth.store';
import { useLocalizedRouter } from '@/hooks/useLocalizedRouter';
import { stripLocalePrefix } from '@/i18n/routing';
import { useT } from '@/hooks/useT';

const AUTH_PAGES = {
  '/login': {
    title: 'login.title',
    footer: { prompt: 'login.noAccount', href: '/register', link: 'login.registerLink' },
  },
  '/register': {
    title: 'register.title',
    footer: { prompt: 'register.haveAccount', href: '/login', link: 'register.signInLink' },
  },
} as const;

type AuthPath = keyof typeof AUTH_PAGES;

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useT();
  const pathname = usePathname();
  const authPath = stripLocalePrefix(pathname) as AuthPath;
  const page = AUTH_PAGES[authPath];
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const router = useLocalizedRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/chat');
  }, [loading, user, router]);

  let content: ReactNode;

  if (loading || user) {
    content = (
      <div className="flex flex-1 items-center justify-center bg-(--bg-app)">
        <EmptyState padding="centered">{t('common.loading')}</EmptyState>
      </div>
    );
  } else if (!page) {
    content = children;
  } else {
    content = (
      <div className="flex flex-1 items-start justify-center overflow-y-auto bg-(--bg-app) pt-6 sm:px-4 sm:pb-10 sm:pt-8">
        <AuthCard
          title={t(page.title)}
          footer={{
            prompt: t(page.footer.prompt),
            href: page.footer.href,
            link: t(page.footer.link),
          }}
        >
          {children}
        </AuthCard>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SiteHeader />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-(--bg-app)">
        {content}
        <HomeFooter t={t} />
      </div>
    </div>
  );
}
