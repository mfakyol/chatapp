import { create } from 'zustand';

interface DraftState {
  drafts: Record<string, string>;
  setDraft: (conversationId: string, draft: string) => void;
  clearDraft: (conversationId: string) => void;
  reset: () => void;
}


export const useDraftStore = create<DraftState>((set) => ({
  drafts: {},
  setDraft: (conversationId, draft) =>
    set((state) => ({ drafts: { ...state.drafts, [conversationId]: draft } })),
  clearDraft: (conversationId) =>
    set((state) => {
      if (!(conversationId in state.drafts)) return state;
      const next = { ...state.drafts };
      delete next[conversationId];
      return { drafts: next };
    }),
  reset: () => set({ drafts: {} }),
}));
