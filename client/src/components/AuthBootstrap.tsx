'use client';

import { useEffect } from 'react';
import { UNAUTHORIZED_EVENT } from '@/lib/api';
import { clearSessionState } from '@/lib/session';
import { useAuthStore } from '@/stores/auth.store';
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
      disconnectSocket();
      clearSessionState();
      useAuthStore.setState({ user: null });
      router.replace('/login');
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [router]);

  return null;
}
