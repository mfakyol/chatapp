import { Dispatch, SetStateAction } from 'react';
import { connectSocket } from '@/lib/socket';
import { fullName, playNotificationSound } from '@/lib/utils';
import { Conversation, Message } from '@/types';
import { getConversations } from '@/services/conversation.service';

export interface ChatSocketContext {
  getActiveConversationId: () => string | null;
  getConversations: () => Conversation[];
  currentUsername: string | undefined;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  setActive: Dispatch<SetStateAction<Conversation | null>>;
}

// Monotonic sequence so an older refetch response can never clobber a newer
// one (or one from a previous subscription).
let refetchSeq = 0;

function refetchConversations(ctx: ChatSocketContext): void {
  const seq = ++refetchSeq;
  getConversations().then((res) => {
    if (seq !== refetchSeq) return; // superseded
    if (res.success) ctx.setConversations(res.data.conversations);
  });
}

function handleNewMessage(
  { message }: { message: Message },
  ctx: ChatSocketContext
) {
  const isActive = message.conversation === ctx.getActiveConversationId();
  const fromSelf = message.sender.username === ctx.currentUsername;

  // Side effects stay OUTSIDE the state updater — updaters must be pure
  // (StrictMode runs them twice, which would double the refetch).
  const known = ctx.getConversations().some((c) => c._id === message.conversation);
  if (!known) {
    refetchConversations(ctx);
  } else {
    ctx.setConversations((prev) => {
      const updated = prev.map((c) =>
        c._id === message.conversation
          ? {
              ...c,
              lastMessage: message,
              unreadCount: isActive ? 0 : (c.unreadCount || 0) + (fromSelf ? 0 : 1),
            }
          : c
      );
      const target = updated.find((c) => c._id === message.conversation);
      if (!target) return prev;
      return [target, ...updated.filter((c) => c._id !== message.conversation)];
    });
  }

  if (fromSelf) return;

  const isHidden = typeof document !== 'undefined' && document.hidden;
  if (!isActive || isHidden) {
    playNotificationSound();
  }
  if (
    isHidden &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    const body = message.attachment ? `📎 ${message.attachment.fileName}` : message.content;
    const notification = new Notification(fullName(message.sender), { body });
    notification.onclick = () => {
      window.focus();
      const conv = ctx.getConversations().find((c) => c._id === message.conversation);
      if (conv) ctx.setActive(conv);
    };
  }
}

function handleConversationUpdated(
  { conversation }: { conversation: Conversation },
  ctx: ChatSocketContext
) {
  ctx.setConversations((prev) =>
    prev.map((c) => (c._id === conversation._id ? { ...c, ...conversation } : c))
  );
  ctx.setActive((prev) =>
    prev && prev._id === conversation._id ? { ...prev, ...conversation } : prev
  );
}

function handleConversationGone(
  { conversationId }: { conversationId: string },
  ctx: ChatSocketContext
) {
  ctx.setConversations((prev) => prev.filter((c) => c._id !== conversationId));
  ctx.setActive((prev) => (prev && prev._id === conversationId ? null : prev));
}

function handleConversationNew(
  { conversation }: { conversation: Conversation },
  ctx: ChatSocketContext
) {
  ctx.setConversations((prev) =>
    prev.some((c) => c._id === conversation._id) ? prev : [conversation, ...prev]
  );
}

/**
 * Subscribes to conversation-level socket events. Returns an unsubscribe
 * function. Uses connectSocket() (idempotent) so subscribing can never
 * silently no-op because the socket wasn't created yet.
 */
export function subscribeChatSocket(ctx: ChatSocketContext): () => void {
  const socket = connectSocket();

  // The FIRST 'connect' of a fresh socket is not a reconnect — the page's own
  // initial fetch already covers it. Only later connects resync.
  let everConnected = socket.connected;
  const onReconnect = () => {
    if (!everConnected) {
      everConnected = true;
      return;
    }
    refetchConversations(ctx);
  };

  const onNewMessage = (payload: { message: Message }) => handleNewMessage(payload, ctx);
  const onConversationUpdated = (payload: { conversation: Conversation }) =>
    handleConversationUpdated(payload, ctx);
  const onConversationGone = (payload: { conversationId: string }) =>
    handleConversationGone(payload, ctx);
  const onConversationNew = (payload: { conversation: Conversation }) =>
    handleConversationNew(payload, ctx);

  socket.on('connect', onReconnect);
  socket.on('message:new', onNewMessage);
  socket.on('conversation:new', onConversationNew);
  socket.on('conversation:updated', onConversationUpdated);
  socket.on('conversation:deleted', onConversationGone);

  return () => {
    refetchSeq++; // invalidate any in-flight refetch for this subscription
    socket.off('connect', onReconnect);
    socket.off('message:new', onNewMessage);
    socket.off('conversation:new', onConversationNew);
    socket.off('conversation:updated', onConversationUpdated);
    socket.off('conversation:deleted', onConversationGone);
  };
}
