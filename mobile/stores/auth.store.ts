import { create } from "zustand";

import { setOnUnauthorized } from "@/lib/api";
import * as authService from "@/services/auth.service";
import type { PublicUser, RegisterPayload } from "@/types";

type AuthStatus = "loading" | "authed" | "guest";

interface AuthState {
  user: PublicUser | null;
  status: AuthStatus;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: PublicUser) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: "loading",
  error: null,

  bootstrap: async () => {
    const res = await authService.me();
    if (res.success) {
      set({ user: res.data.user, status: "authed" });
    } else {
      set({ user: null, status: "guest" });
    }
  },

  login: async (identifier, password) => {
    set({ error: null });
    const res = await authService.login(identifier, password);
    if (res.success) {
      set({ user: res.data.user, status: "authed" });
      return true;
    }
    set({ error: res.error });
    return false;
  },

  register: async (payload) => {
    set({ error: null });
    const res = await authService.register(payload);
    if (res.success) {
      set({ user: res.data.user, status: "authed" });
      return true;
    }
    set({ error: res.error });
    return false;
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, status: "guest" });
  },

  setUser: (user) => {
    set({ user });
  },
}));

setOnUnauthorized(() => {
  if (useAuthStore.getState().status === "authed") {
    useAuthStore.setState({ user: null, status: "guest" });
  }
});
