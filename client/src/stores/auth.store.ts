import { create } from 'zustand';
import { setToken, Result } from '@/lib/api';
import * as authService from '@/services/auth.service';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { PublicUser, RegisterPayload } from '@/types';

export type { RegisterPayload };

interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  /** Restore a session from a stored token on app start. */
  bootstrap: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<Result<void>>;
  register: (payload: RegisterPayload) => Promise<Result<void>>;
  logout: () => void;
}

// Navigation is intentionally left out of the store (it needs the router hook);
// the `useAuth` hook wraps these actions and handles routing.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  bootstrap: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      set({ loading: false });
      return;
    }
    const res = await authService.me();
    if (res.success) {
      set({ user: res.data.user });
      connectSocket(token);
    } else {
      setToken(null);
    }
    set({ loading: false });
  },

  login: async (identifier, password) => {
    const res = await authService.login(identifier, password);
    if (!res.success) return res;
    setToken(res.data.token);
    set({ user: res.data.user });
    connectSocket(res.data.token);
    return { success: true, data: undefined };
  },

  register: async (payload) => {
    const res = await authService.register(payload);
    if (!res.success) return res;
    setToken(res.data.token);
    set({ user: res.data.user });
    connectSocket(res.data.token);
    return { success: true, data: undefined };
  },

  logout: () => {
    setToken(null);
    set({ user: null });
    disconnectSocket();
  },
}));
