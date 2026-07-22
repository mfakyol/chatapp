'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore, RegisterPayload } from '@/stores/auth.store';

/**
 * Auth hook backed by the zustand auth store, adding client-side navigation on
 * login/register/logout. Same shape the app used with the old AuthContext.
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
    login: async (identifier: string, password: string) => {
      const res = await login(identifier, password);
      if (res.success) router.push('/chat');
      return res;
    },
    register: async (payload: RegisterPayload) => {
      const res = await register(payload);
      if (res.success) router.push('/chat');
      return res;
    },
    logout: () => {
      logout();
      router.push('/login');
    },
  };
}
