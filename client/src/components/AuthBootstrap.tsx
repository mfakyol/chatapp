'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { usePresenceStore } from '@/stores/presence.store';
import { disconnectSocket } from '@/lib/socket';

/**
 * Runs the session-restore once at app start, and reacts to `app:unauthorized`
 * (fired by the api layer on any 401): a logged-in user whose session expired
 * is signed out and sent to /login instead of staring at a broken app.
 */
export default function AuthBootstrap() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const router = useRouter();

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    function onUnauthorized() {
      if (!useAuthStore.getState().user) return; // not logged in — nothing to do
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
