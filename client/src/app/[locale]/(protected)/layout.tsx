'use client';

import { useEffect, ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useLocalizedRouter } from '@/hooks/useLocalizedRouter';
import { usePresenceSocket } from '@/hooks/usePresenceSocket';
import { EmptyState } from '@/components/ui/EmptyState';
import { useT } from '@/hooks/useT';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { t } = useT();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const router = useLocalizedRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  usePresenceSocket(Boolean(user));

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <EmptyState padding="centered">{t('common.loading')}</EmptyState>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
