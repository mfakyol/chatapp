import { create } from 'zustand';

interface DraftState {
  /** Unsent composer text per conversation id — survives chat switches. */
  drafts: Record<string, string>;
  setDraft: (conversationId: string, draft: string) => void;
  clearDraft: (conversationId: string) => void;
}

/**
 * WhatsApp-style per-chat drafts: the Composer is remounted on conversation
 * switch (by design), so in-progress text is parked here and restored on
 * return. In-memory only — drafts don't outlive the tab.
 */
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
}));
