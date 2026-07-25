import { create } from 'zustand';

export interface ToastItem {
  id: number;
  text: string;
}

const DEFAULT_DURATION_MS = 4000;

interface ToastState {
  toasts: ToastItem[];
  push: (text: string, durationMs?: number) => void;
  remove: (id: number) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (text, durationMs = DEFAULT_DURATION_MS) => {
    const id = Date.now() + Math.random();
    set((state) => ({ toasts: [...state.toasts, { id, text }] }));
    setTimeout(() => get().remove(id), durationMs);
  },

  remove: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));
