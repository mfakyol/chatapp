import { create } from 'zustand';

export interface PresenceEntry {
  isOnline: boolean;
  lastSeen?: string;
}

interface PresenceState {
  presence: Record<string, PresenceEntry>;
  setPresence: (userId: string, entry: PresenceEntry) => void;
  /** Clear everything — presence must not leak across accounts on logout. */
  reset: () => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  presence: {},
  setPresence: (userId, entry) =>
    set((state) => ({ presence: { ...state.presence, [userId]: entry } })),
  reset: () => set({ presence: {} }),
}));
