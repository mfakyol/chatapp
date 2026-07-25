'use client';

import { useRouter } from 'next/navigation';
import { useT } from '@/hooks/useT';
import { isLocalizedPath, localizedPath } from '@/i18n/routing';

export function useLocalizedRouter() {
  const router = useRouter();
  const { locale } = useT();
  const to = (path: string) => (isLocalizedPath(path) ? path : localizedPath(path, locale));

  return {
    push: (path: string) => router.push(to(path)),
    replace: (path: string) => router.replace(to(path)),
    back: router.back,
    forward: router.forward,
    refresh: router.refresh,
  };
}
