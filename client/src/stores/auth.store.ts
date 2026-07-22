import { create } from 'zustand';
import { apiFetch, setToken } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { PublicUser } from '@/types';

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  /** Restore a session from a stored token on app start. */
  bootstrap: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
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
    try {
      const data = await apiFetch<{ user: PublicUser }>('/auth/me');
      set({ user: data.user });
      connectSocket(token);
    } catch {
      setToken(null);
    } finally {
      set({ loading: false });
    }
  },

  login: async (identifier, password) => {
    const data = await apiFetch<{ token: string; user: PublicUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    setToken(data.token);
    set({ user: data.user });
    connectSocket(data.token);
  },

  register: async (payload) => {
    const data = await apiFetch<{ token: string; user: PublicUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setToken(data.token);
    set({ user: data.user });
    connectSocket(data.token);
  },

  logout: () => {
    setToken(null);
    set({ user: null });
    disconnectSocket();
  },
}));
