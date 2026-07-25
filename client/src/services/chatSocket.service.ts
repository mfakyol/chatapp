import { connectSocket } from '@/lib/socket';
import { fullName, playNotificationSound } from '@/lib/utils';
import { Conversation, Message } from '@/types';
import { getConversations } from '@/services/conversation.service';
import { selectConversation } from '@/services/chat.service';
import { useChatStore } from '@/stores/chat.store';

let refetchSeq = 0;

function store() {
  return useChatStore.getState();
}

function refetchConversations(): void {
  const seq = ++refetchSeq;
  getConversations().then((res) => {
    if (seq !== refetchSeq) return;
    if (res.success) store().setConversations(res.data.conversations);
  });
}

function handleNewMessage({ message }: { message: Message }, currentUsername: string) {
  const isActive = message.conversation === store().activeId;
  const fromSelf = message.sender.username === currentUsername;

  const known = store().conversations.some((c) => c._id === message.conversation);
  if (!known) {
    refetchConversations();
  } else {
    store().patchConversations((prev) => {
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
      const conv = store().conversations.find((c) => c._id === message.conversation);
      if (conv) selectConversation(conv);
    };
  }
}

function handleConversationUpdated({ conversation }: { conversation: Conversation }) {
  store().patchConversations((prev) =>
    prev.map((c) => (c._id === conversation._id ? { ...c, ...conversation } : c))
  );
}

function handleConversationGone({ conversationId }: { conversationId: string }) {
  store().patchConversations((prev) => prev.filter((c) => c._id !== conversationId));
  if (store().activeId === conversationId) store().setActiveId(null);
}

function handleConversationNew({ conversation }: { conversation: Conversation }) {
  store().patchConversations((prev) =>
    prev.some((c) => c._id === conversation._id) ? prev : [conversation, ...prev]
  );
}

export function subscribeChatSocket(currentUsername: string): () => void {
  const socket = connectSocket();

  let everConnected = socket.connected;
  const onReconnect = () => {
    if (!everConnected) {
      everConnected = true;
      return;
    }
    refetchConversations();
  };

  const onNewMessage = (payload: { message: Message }) =>
    handleNewMessage(payload, currentUsername);
  const onConversationUpdated = (payload: { conversation: Conversation }) =>
    handleConversationUpdated(payload);
  const onConversationGone = (payload: { conversationId: string }) =>
    handleConversationGone(payload);
  const onConversationNew = (payload: { conversation: Conversation }) =>
    handleConversationNew(payload);

  socket.on('connect', onReconnect);
  socket.on('message:new', onNewMessage);
  socket.on('conversation:new', onConversationNew);
  socket.on('conversation:updated', onConversationUpdated);
  socket.on('conversation:deleted', onConversationGone);

  return () => {
    refetchSeq++;
    socket.off('connect', onReconnect);
    socket.off('message:new', onNewMessage);
    socket.off('conversation:new', onConversationNew);
    socket.off('conversation:updated', onConversationUpdated);
    socket.off('conversation:deleted', onConversationGone);
  };
}
