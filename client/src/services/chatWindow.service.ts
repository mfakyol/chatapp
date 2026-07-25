import {
  markRead,
  getMessages,
  getOlderMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  searchMessages,
} from '@/services/conversation.service';
import { subscribeConversationWindowSocket } from '@/services/conversationWindowSocket.service';
import { useChatWindowStore } from '@/stores/chatWindow.store';
import { useAuthStore } from '@/stores/auth.store';
import { userId } from '@/lib/utils';
import type { Message } from '@/types';

const PAGE_SIZE = 50;

let loadActive = false;
let loadAbort: AbortController | null = null;
let socketCleanup: (() => void) | null = null;
let visibilityCleanup: (() => void) | null = null;
let markReadTimer: ReturnType<typeof setTimeout> | null = null;
let searchTimer: ReturnType<typeof setTimeout> | null = null;
let pendingRead = false;
let confirmFn: ((message: string) => Promise<boolean>) | null = null;
const typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function store() {
  return useChatWindowStore.getState();
}

export function registerChatConfirm(fn: (message: string) => Promise<boolean>) {
  confirmFn = fn;
}

export function unregisterChatConfirm() {
  confirmFn = null;
}

function clearTypingTimeout(userId: string) {
  const existing = typingTimeouts.get(userId);
  if (existing) clearTimeout(existing);
  typingTimeouts.delete(userId);
}

function onVisibility(conversationId: string) {
  if (!document.hidden && pendingRead) {
    pendingRead = false;
    scheduleMarkRead(conversationId);
  }
}

export function scheduleMarkRead(conversationId: string) {
  if (typeof document !== 'undefined' && document.hidden) {
    pendingRead = true;
    return;
  }
  if (markReadTimer) return;
  markReadTimer = setTimeout(() => {
    markReadTimer = null;
    markRead(conversationId);
  }, 500);
}

function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  const { showSearch, searchQuery, conversationId } = store();
  if (!showSearch || !searchQuery.trim() || !conversationId) {
    store().setSearchResults([]);
    return;
  }
  searchTimer = setTimeout(async () => {
    const res = await searchMessages(searchQuery.trim(), conversationId);
    if (res.success) store().setSearchResults(res.data.messages);
  }, 300);
}

export async function jumpToMessage(messageId: string) {
  const { messages, conversationId } = store();
  if (!conversationId) return;
  if (messages.some((m) => m._id === messageId)) {
    store().setScrollTarget(messageId);
    return;
  }
  const res = await getMessages(conversationId, messageId);
  if (!res.success) return;
  store().jumpReplace(res.data.messages);
  store().setScrollTarget(messageId);
}

export function clearScrollTarget() {
  store().setScrollTarget(null);
}

export function openChatWindow(conversationId: string, currentUsername: string) {
  closeChatWindow();

  store().setConversationId(conversationId);
  loadActive = true;
  loadAbort = new AbortController();

  getMessages(conversationId, undefined, { signal: loadAbort.signal }).then((res) => {
    if (!loadActive) return;
    store().setLoading(false);
    if (!res.success) return;
    store().setMessages(res.data.messages);
    if (res.data.messages.length < PAGE_SIZE) store().setHasMore(false);
  });

  scheduleMarkRead(conversationId);

  const onVisibilityChange = () => onVisibility(conversationId);
  document.addEventListener('visibilitychange', onVisibilityChange);
  visibilityCleanup = () => document.removeEventListener('visibilitychange', onVisibilityChange);

  socketCleanup = subscribeConversationWindowSocket(conversationId, {
    onReconnect: () => {
      getMessages(conversationId).then((res) => {
        if (!loadActive || !res.success) return;
        store().setMessages(res.data.messages);
        store().setHasMore(res.data.messages.length >= PAGE_SIZE);
        store().setDetached(false);
      });
      scheduleMarkRead(conversationId);
    },
    onNewMessage: (message) => {
      if (!store().detached) store().upsert(message);
      if (message.sender.username !== currentUsername) scheduleMarkRead(conversationId);
    },
    onEdited: (message) => store().replace(message._id, message),
    onDeleted: (messageId) => store().markMessageDeleted(messageId),
    onConversationRead: (userId, lastReadAt) => store().setReadOverride(userId, lastReadAt),
    onReaction: (messageId, reactions) => store().setMessageReactions(messageId, reactions),
    onTypingStart: (userId) => {
      store().addTyping(userId);
      clearTypingTimeout(userId);
      typingTimeouts.set(
        userId,
        setTimeout(() => store().removeTyping(userId), 3000)
      );
    },
    onTypingStop: (userId) => {
      clearTypingTimeout(userId);
      store().removeTyping(userId);
    },
  });
}

export function closeChatWindow() {
  loadActive = false;
  loadAbort?.abort();
  loadAbort = null;
  visibilityCleanup?.();
  visibilityCleanup = null;
  socketCleanup?.();
  socketCleanup = null;
  typingTimeouts.forEach((timer) => clearTimeout(timer));
  typingTimeouts.clear();
  store().clearTyping();
  if (markReadTimer) {
    clearTimeout(markReadTimer);
    markReadTimer = null;
  }
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
  pendingRead = false;
  store().reset();
}

export async function returnToLatest() {
  const conversationId = store().conversationId;
  if (!conversationId) return;
  const res = await getMessages(conversationId);
  if (!res.success) return;
  store().setMessages(res.data.messages);
  store().setHasMore(res.data.messages.length >= PAGE_SIZE);
  store().setDetached(false);
}

export async function loadOlderMessages() {
  const { messages, hasMore, conversationId } = store();
  if (!conversationId || !hasMore || messages.length === 0) return null;
  const res = await getOlderMessages(conversationId, messages[0].createdAt);
  if (!res.success) return null;
  if (res.data.messages.length === 0) {
    store().setHasMore(false);
    return [];
  }
  store().prepend(res.data.messages);
  return res.data.messages;
}

export async function sendChatMessage(content: string, replyToId?: string): Promise<boolean> {
  const conversationId = store().conversationId;
  const user = useAuthStore.getState().user;
  if (!conversationId || !user) return false;

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  if (store().detached) await returnToLatest();

  const currentUserId = userId(user);
  const replyingTo = store().replyingTo;
  const tempId = `tmp-${crypto.randomUUID()}`;
  const temp: Message = {
    _id: tempId,
    clientTempId: tempId,
    conversation: conversationId,
    sender: {
      id: currentUserId,
      _id: currentUserId,
      username: user.username,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
    },
    content,
    reactions: [],
    replyTo: replyingTo ?? undefined,
    createdAt: new Date().toISOString(),
    pending: true,
  };
  store().upsert(temp);
  store().setReplyingTo(null);

  const res = await sendMessage(conversationId, {
    content,
    replyTo: replyToId,
    clientTempId: tempId,
  });
  if (!res.success) {
    store().dropMessage(tempId);
    return false;
  }
  store().upsert(res.data.message);
  return true;
}

export async function editChatMessage(messageId: string, content: string) {
  const conversationId = store().conversationId;
  if (!conversationId) return;
  const res = await editMessage(conversationId, messageId, content);
  if (res.success) store().replace(messageId, res.data.message);
}

export async function requestDeleteMessage(messageId: string, confirmMessage: string) {
  if (!confirmFn || !(await confirmFn(confirmMessage))) return;
  const conversationId = store().conversationId;
  if (!conversationId) return;
  const res = await deleteMessage(conversationId, messageId);
  if (res.success) store().markMessageDeleted(messageId);
}

export function reactChatMessage(messageId: string, emoji: string) {
  const conversationId = store().conversationId;
  if (!conversationId) return;
  reactToMessage(conversationId, messageId, emoji);
}

export function toggleSearch() {
  store().setShowSearch(!store().showSearch);
  scheduleSearch();
}

export function closeSearch() {
  store().setShowSearch(false);
  store().setSearchResults([]);
}

export function setSearchQuery(query: string) {
  store().setSearchQuery(query);
  scheduleSearch();
}

export function openProfile() {
  store().setShowProfile(true);
}

export function closeProfile() {
  store().setShowProfile(false);
}

export function cancelReply() {
  store().setReplyingTo(null);
}

export function setReplyingTo(message: Message) {
  store().setReplyingTo(message);
}
