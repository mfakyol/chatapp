import { create } from "zustand";

import * as conversationService from "@/services/conversation.service";
import type { AttachmentFile } from "@/services/conversation.service";
import type { Conversation, Message, Reaction } from "@/types";

interface ChatState {
  conversations: Conversation[];
  conversationsLoaded: boolean;
  refreshing: boolean;
  messagesByConversation: Record<string, Message[]>;
  activeConversationId: string | null;
  hasMoreOlder: Record<string, boolean>;
  loadingOlder: Record<string, boolean>;
  typingByConversation: Record<string, string[]>;

  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  loadOlderMessages: (conversationId: string) => Promise<void>;
  sendAttachment: (conversationId: string, file: AttachmentFile) => Promise<boolean>;
  setTyping: (conversationId: string, userId: string, typing: boolean) => void;
  reactToMessage: (
    conversationId: string,
    messageId: string,
    emoji: string,
  ) => Promise<void>;
  editMessage: (
    conversationId: string,
    messageId: string,
    content: string,
  ) => Promise<boolean>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  openDirectConversation: (username: string) => Promise<string | null>;
  sendMessage: (conversationId: string, content: string) => Promise<boolean>;
  markRead: (conversationId: string) => Promise<void>;
  setActiveConversation: (conversationId: string | null) => void;

  applyIncomingMessage: (message: Message, fromSelf: boolean) => void;
  applyMessageUpdated: (message: Message) => void;
  applyMessageDeleted: (conversationId: string, messageId: string) => void;
  applyMessageReaction: (
    conversationId: string,
    messageId: string,
    reactions: Reaction[],
  ) => void;
  upsertConversation: (conversation: Conversation) => void;
  removeConversation: (conversationId: string) => void;
  applyPresence: (userId: string, isOnline: boolean, lastSeen?: string) => void;
}

function appendUnique(list: Message[], message: Message): Message[] {
  if (list.some((m) => m._id === message._id)) return list;
  return [...list, message];
}

function patchMessage(
  state: { messagesByConversation: Record<string, Message[]> },
  conversationId: string,
  messageId: string,
  patch: (m: Message) => Message,
): Record<string, Message[]> {
  const existing = state.messagesByConversation[conversationId];
  if (!existing) return state.messagesByConversation;
  return {
    ...state.messagesByConversation,
    [conversationId]: existing.map((m) => (m._id === messageId ? patch(m) : m)),
  };
}

export const useChatStore = create<ChatState>((set, get) => {
  const applySentMessage = (conversationId: string, message: Message) => {
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: appendUnique(
          state.messagesByConversation[conversationId] ?? [],
          message,
        ),
      },
      conversations: state.conversations.map((c) =>
        c._id === conversationId ? { ...c, lastMessage: message } : c,
      ),
    }));
  };

  return {
  conversations: [],
  conversationsLoaded: false,
  refreshing: false,
  messagesByConversation: {},
  activeConversationId: null,
  hasMoreOlder: {},
  loadingOlder: {},
  typingByConversation: {},

  loadConversations: async () => {
    set({ refreshing: true });
    const res = await conversationService.getConversations();
    if (res.success) {
      set({ conversations: res.data.conversations, conversationsLoaded: true });
    }
    set({ refreshing: false });
  },

  loadMessages: async (conversationId) => {
    const res = await conversationService.getMessages(conversationId);
    if (res.success) {
      set((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: res.data.messages,
        },
      }));
    }
  },

  loadOlderMessages: async (conversationId) => {
    const state = get();
    const messages = state.messagesByConversation[conversationId];
    if (!messages || messages.length === 0) return;
    if (state.loadingOlder[conversationId]) return;
    if (state.hasMoreOlder[conversationId] === false) return;

    set((s) => ({
      loadingOlder: { ...s.loadingOlder, [conversationId]: true },
    }));

    const res = await conversationService.getOlderMessages(
      conversationId,
      messages[0].createdAt,
    );

    set((s) => {
      const current = s.messagesByConversation[conversationId] ?? [];
      const next: Partial<ChatState> = {
        loadingOlder: { ...s.loadingOlder, [conversationId]: false },
      };
      if (res.success) {
        if (res.data.messages.length === 0) {
          next.hasMoreOlder = { ...s.hasMoreOlder, [conversationId]: false };
        } else {
          const known = new Set(current.map((m) => m._id));
          const older = res.data.messages.filter((m) => !known.has(m._id));
          next.messagesByConversation = {
            ...s.messagesByConversation,
            [conversationId]: [...older, ...current],
          };
        }
      }
      return next;
    });
  },

  sendMessage: async (conversationId, content) => {
    const res = await conversationService.sendMessage(conversationId, { content });
    if (!res.success) return false;
    applySentMessage(conversationId, res.data.message);
    return true;
  },

  sendAttachment: async (conversationId, file) => {
    const res = await conversationService.sendAttachment(conversationId, file);
    if (!res.success) return false;
    applySentMessage(conversationId, res.data.message);
    return true;
  },

  reactToMessage: async (conversationId, messageId, emoji) => {
    const res = await conversationService.reactToMessage(
      conversationId,
      messageId,
      emoji,
    );
    if (res.success) {
      get().applyMessageReaction(conversationId, messageId, res.data.reactions);
    }
  },

  editMessage: async (conversationId, messageId, content) => {
    const res = await conversationService.editMessage(
      conversationId,
      messageId,
      content,
    );
    if (!res.success) return false;
    get().applyMessageUpdated(res.data.message);
    return true;
  },

  deleteMessage: async (conversationId, messageId) => {
    const res = await conversationService.deleteMessage(conversationId, messageId);
    if (res.success) {
      get().applyMessageDeleted(conversationId, messageId);
    }
  },

  openDirectConversation: async (username) => {
    const res = await conversationService.createDirectConversation(username);
    if (!res.success) return null;
    get().upsertConversation(res.data.conversation);
    return res.data.conversation._id;
  },

  setTyping: (conversationId, userId, typing) => {
    set((state) => {
      const current = state.typingByConversation[conversationId] ?? [];
      const has = current.includes(userId);
      if (typing === has) return state;
      return {
        typingByConversation: {
          ...state.typingByConversation,
          [conversationId]: typing
            ? [...current, userId]
            : current.filter((id) => id !== userId),
        },
      };
    });
  },

  markRead: async (conversationId) => {
    const res = await conversationService.markRead(conversationId);
    if (res.success) {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c._id === conversationId ? { ...c, unreadCount: 0 } : c,
        ),
      }));
    }
  },

  setActiveConversation: (conversationId) => {
    set({ activeConversationId: conversationId });
  },

  applyIncomingMessage: (message, fromSelf) => {
    const state = get();
    const conversationId = message.conversation;
    const isActive = state.activeConversationId === conversationId;

    const known = state.conversations.some((c) => c._id === conversationId);
    if (!known) {
      state.loadConversations();
    }

    set((s) => {
      const loaded = s.messagesByConversation[conversationId];
      const updated = s.conversations.map((c) =>
        c._id === conversationId
          ? {
              ...c,
              lastMessage: message,
              unreadCount:
                isActive || fromSelf ? c.unreadCount ?? 0 : (c.unreadCount ?? 0) + 1,
            }
          : c,
      );
      const target = updated.find((c) => c._id === conversationId);

      return {
        messagesByConversation: loaded
          ? {
              ...s.messagesByConversation,
              [conversationId]: appendUnique(loaded, message),
            }
          : s.messagesByConversation,
        conversations: target
          ? [target, ...updated.filter((c) => c._id !== conversationId)]
          : updated,
      };
    });

    if (isActive && !fromSelf) {
      state.markRead(conversationId);
    }
  },

  applyMessageUpdated: (message) => {
    set((state) => ({
      messagesByConversation: patchMessage(
        state,
        message.conversation,
        message._id,
        () => message,
      ),
    }));
  },

  applyMessageDeleted: (conversationId, messageId) => {
    set((state) => ({
      messagesByConversation: patchMessage(state, conversationId, messageId, (m) => ({
        ...m,
        content: "",
        attachment: undefined,
        deletedAt: new Date().toISOString(),
      })),
    }));
  },

  applyMessageReaction: (conversationId, messageId, reactions) => {
    set((state) => ({
      messagesByConversation: patchMessage(state, conversationId, messageId, (m) => ({
        ...m,
        reactions,
      })),
    }));
  },

  upsertConversation: (conversation) => {
    set((state) => {
      const exists = state.conversations.some((c) => c._id === conversation._id);
      return {
        conversations: exists
          ? state.conversations.map((c) =>
              c._id === conversation._id ? { ...c, ...conversation } : c,
            )
          : [conversation, ...state.conversations],
      };
    });
  },

  applyPresence: (targetUserId, isOnline, lastSeen) => {
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (!c.participants.some((p) => (p.id ?? p._id) === targetUserId)) return c;
        return {
          ...c,
          participants: c.participants.map((p) =>
            (p.id ?? p._id) === targetUserId
              ? { ...p, isOnline, lastSeen: lastSeen ?? p.lastSeen }
              : p,
          ),
        };
      }),
    }));
  },

  removeConversation: (conversationId) => {
    set((state) => {
      const rest = { ...state.messagesByConversation };
      delete rest[conversationId];
      return {
        conversations: state.conversations.filter((c) => c._id !== conversationId),
        messagesByConversation: rest,
      };
    });
  },
  };
});
