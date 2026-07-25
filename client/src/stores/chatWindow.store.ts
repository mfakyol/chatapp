import { create } from 'zustand';
import { markDeleted, replaceMessage, setReactions, upsertMessage } from '@/lib/messageListOps';
import type { Message, MessageSearchResult } from '@/types';

interface ChatWindowState {
  conversationId: string | null;
  messages: Message[];
  initialLoading: boolean;
  hasMore: boolean;
  detached: boolean;
  typingUsers: string[];
  readOverrides: Record<string, string>;
  scrollTargetMessageId: string | null;
  replyingTo: Message | null;
  showProfile: boolean;
  showSearch: boolean;
  searchQuery: string;
  searchResults: MessageSearchResult[];
  reset: () => void;
  setConversationId: (conversationId: string) => void;
  setLoading: (initialLoading: boolean) => void;
  setMessages: (messages: Message[]) => void;
  setHasMore: (hasMore: boolean) => void;
  setDetached: (detached: boolean) => void;
  upsert: (message: Message) => void;
  replace: (messageId: string, message: Message) => void;
  dropMessage: (messageId: string) => void;
  markMessageDeleted: (messageId: string) => void;
  setMessageReactions: (messageId: string, reactions: Message['reactions']) => void;
  prepend: (older: Message[]) => void;
  jumpReplace: (list: Message[]) => void;
  setReadOverride: (userId: string, lastReadAt: string) => void;
  addTyping: (userId: string) => void;
  removeTyping: (userId: string) => void;
  clearTyping: () => void;
  setScrollTarget: (messageId: string | null) => void;
  setReplyingTo: (message: Message | null) => void;
  setShowProfile: (showProfile: boolean) => void;
  setShowSearch: (showSearch: boolean) => void;
  setSearchQuery: (searchQuery: string) => void;
  setSearchResults: (searchResults: MessageSearchResult[]) => void;
}

const empty = {
  conversationId: null as string | null,
  messages: [] as Message[],
  initialLoading: true,
  hasMore: true,
  detached: false,
  typingUsers: [] as string[],
  readOverrides: {} as Record<string, string>,
  scrollTargetMessageId: null as string | null,
  replyingTo: null as Message | null,
  showProfile: false,
  showSearch: false,
  searchQuery: '',
  searchResults: [] as MessageSearchResult[],
};

export const useChatWindowStore = create<ChatWindowState>((set, get) => ({
  ...empty,
  reset: () => set({ ...empty }),
  setConversationId: (conversationId) => set({ conversationId }),
  setLoading: (initialLoading) => set({ initialLoading }),
  setMessages: (messages) => set({ messages }),
  setHasMore: (hasMore) => set({ hasMore }),
  setDetached: (detached) => set({ detached }),
  upsert: (message) => set((s) => ({ messages: upsertMessage(s.messages, message) })),
  replace: (messageId, message) =>
    set((s) => ({ messages: replaceMessage(s.messages, messageId, message) })),
  dropMessage: (messageId) =>
    set((s) => ({ messages: s.messages.filter((m) => m._id !== messageId) })),
  markMessageDeleted: (messageId) =>
    set((s) => ({ messages: markDeleted(s.messages, messageId) })),
  setMessageReactions: (messageId, reactions) =>
    set((s) => ({ messages: setReactions(s.messages, messageId, reactions) })),
  prepend: (older) => set((s) => ({ messages: [...older, ...s.messages] })),
  jumpReplace: (list) => {
    const latestKnownId = get().messages[get().messages.length - 1]?._id;
    set({
      messages: list,
      hasMore: true,
      detached: !latestKnownId || !list.some((m) => m._id === latestKnownId),
    });
  },
  setReadOverride: (userId, lastReadAt) =>
    set((s) => ({ readOverrides: { ...s.readOverrides, [userId]: lastReadAt } })),
  addTyping: (userId) =>
    set((s) =>
      s.typingUsers.includes(userId) ? s : { typingUsers: [...s.typingUsers, userId] }
    ),
  removeTyping: (userId) =>
    set((s) => ({ typingUsers: s.typingUsers.filter((id) => id !== userId) })),
  clearTyping: () => set({ typingUsers: [] }),
  setScrollTarget: (scrollTargetMessageId) => set({ scrollTargetMessageId }),
  setReplyingTo: (replyingTo) => set({ replyingTo }),
  setShowProfile: (showProfile) => set({ showProfile }),
  setShowSearch: (showSearch) => set({ showSearch }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchResults: (searchResults) => set({ searchResults }),
}));
