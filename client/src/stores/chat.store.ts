import { create } from 'zustand';
import type { Conversation } from '@/types';

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
  focusMessageId: string | null;
  setConversations: (conversations: Conversation[]) => void;
  patchConversations: (fn: (prev: Conversation[]) => Conversation[]) => void;
  setActiveId: (activeId: string | null) => void;
  setFocusMessageId: (focusMessageId: string | null) => void;
  reset: () => void;
}

const empty = {
  conversations: [] as Conversation[],
  activeId: null as string | null,
  focusMessageId: null as string | null,
};

export const useChatStore = create<ChatState>((set) => ({
  ...empty,
  setConversations: (conversations) => set({ conversations }),
  patchConversations: (fn) => set((s) => ({ conversations: fn(s.conversations) })),
  setActiveId: (activeId) => set({ activeId }),
  setFocusMessageId: (focusMessageId) => set({ focusMessageId }),
  reset: () => set({ ...empty }),
}));

export function selectActiveConversation(state: ChatState): Conversation | null {
  if (!state.activeId) return null;
  return state.conversations.find((c) => c._id === state.activeId) ?? null;
}
