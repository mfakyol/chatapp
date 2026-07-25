'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { usePresenceStore } from '@/stores/presence.store';
import { useLocalizedRouter } from '@/hooks/useLocalizedRouter';
import { disconnectSocket } from '@/lib/socket';


export default function AuthBootstrap() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const router = useLocalizedRouter();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    function onUnauthorized() {
      if (!useAuthStore.getState().user) return;
      useAuthStore.setState({ user: null });
      disconnectSocket();
      usePresenceStore.getState().reset();
      router.replace('/login');
    }
    window.addEventListener('app:unauthorized', onUnauthorized);
    return () => window.removeEventListener('app:unauthorized', onUnauthorized);
  }, [router]);

  return null;
}
