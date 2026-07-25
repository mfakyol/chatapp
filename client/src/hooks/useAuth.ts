'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Auth hook backed by the zustand auth store. Navigation after login/register
 * is owned by the pages' redirect effects (they send a signed-in user to
 * /chat), so success here doesn't navigate — no double router calls.
 */
export function useAuth() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);

  return {
    user,
    loading,
    login,
    register,
    logout: () => {
      logout();
      router.push('/login');
    },
  };
}
