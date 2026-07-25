import { create } from 'zustand';
import { Result } from '@/lib/api';
import * as authService from '@/services/auth.service';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { usePresenceStore } from '@/stores/presence.store';
import { PublicUser, RegisterPayload } from '@/types';

export type { RegisterPayload };

interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  
  bootstrap: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<Result<void>>;
  register: (payload: RegisterPayload) => Promise<Result<void>>;
  logout: () => void;
}


export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  bootstrap: async () => {
    
    const res = await authService.me();
    if (res.success) {
      set({ user: res.data.user });
      connectSocket();
    }
    set({ loading: false });
  },

  login: async (identifier, password) => {
    const res = await authService.login(identifier, password);
    if (!res.success) return res;
    set({ user: res.data.user });
    connectSocket();
    return { success: true, data: undefined };
  },

  register: async (payload) => {
    const res = await authService.register(payload);
    if (!res.success) return res;
    set({ user: res.data.user });
    connectSocket();
    return { success: true, data: undefined };
  },

  logout: () => {
    authService.logout(); 
    set({ user: null });
    disconnectSocket();
    usePresenceStore.getState().reset();
  },
}));
