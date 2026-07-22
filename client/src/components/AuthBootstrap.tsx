'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';

/** Runs the session-restore once at app start (replaces AuthProvider's effect). */
export default function AuthBootstrap() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);
  return null;
}
