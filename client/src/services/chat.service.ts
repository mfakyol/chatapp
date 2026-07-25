import { getConversations } from '@/services/conversation.service';
import { subscribeChatSocket } from '@/services/chatSocket.service';
import { useChatStore } from '@/stores/chat.store';
import type { Conversation } from '@/types';

function store() {
  return useChatStore.getState();
}

export function loadConversations() {
  getConversations().then((res) => {
    if (res.success) store().setConversations(res.data.conversations);
  });
}

export function selectConversation(conversation: Conversation) {
  store().setActiveId(conversation._id);
  store().patchConversations((prev) =>
    prev.map((c) => (c._id === conversation._id ? { ...c, unreadCount: 0 } : c))
  );
}

export function addConversation(conversation: Conversation) {
  store().patchConversations((prev) => {
    if (prev.some((c) => c._id === conversation._id)) return prev;
    return [conversation, ...prev];
  });
  store().setActiveId(conversation._id);
}

export function openSearchResult(conversationId: string, messageId: string) {
  const conversation = store().conversations.find((c) => c._id === conversationId);
  if (!conversation) return;
  selectConversation(conversation);
  store().setFocusMessageId(messageId);
}

export function closeActive() {
  store().setActiveId(null);
}

export function clearFocusMessage() {
  store().setFocusMessageId(null);
}

export function initChatSocket(currentUsername: string) {
  return subscribeChatSocket(currentUsername);
}
