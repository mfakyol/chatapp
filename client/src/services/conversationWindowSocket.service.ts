import { connectSocket } from '@/lib/socket';
import { Message } from '@/types';

export interface ConversationWindowSocketHandlers {
  onReconnect: () => void;
  onNewMessage: (message: Message) => void;
  onEdited: (message: Message) => void;
  onDeleted: (messageId: string) => void;
  onConversationRead: (userId: string, lastReadAt: string) => void;
  onReaction: (messageId: string, reactions: Message['reactions']) => void;
  onTypingStart: (userId: string) => void;
  onTypingStop: (userId: string) => void;
}

export function subscribeConversationWindowSocket(
  conversationId: string,
  handlers: ConversationWindowSocketHandlers
): () => void {
  const socket = connectSocket();
  let everConnected = socket.connected;

  const onReconnect = () => {
    if (!everConnected) {
      everConnected = true;
      return;
    }
    handlers.onReconnect();
  };

  const onNewMessage = ({ message }: { message: Message }) => {
    if (message.conversation !== conversationId) return;
    handlers.onNewMessage(message);
  };

  const onEdited = ({ message }: { message: Message }) => {
    if (message.conversation !== conversationId) return;
    handlers.onEdited(message);
  };

  const onDeleted = ({ conversationId: cid, messageId }: { conversationId: string; messageId: string }) => {
    if (cid !== conversationId) return;
    handlers.onDeleted(messageId);
  };

  const onConversationRead = ({
    conversationId: cid,
    userId,
    lastReadAt,
  }: {
    conversationId: string;
    userId: string;
    lastReadAt: string;
  }) => {
    if (cid !== conversationId) return;
    handlers.onConversationRead(userId, lastReadAt);
  };

  const onReaction = ({
    conversationId: cid,
    messageId,
    reactions,
  }: {
    conversationId: string;
    messageId: string;
    reactions: Message['reactions'];
  }) => {
    if (cid !== conversationId) return;
    handlers.onReaction(messageId, reactions);
  };

  const onTypingStart = ({ conversationId: cid, userId }: { conversationId: string; userId: string }) => {
    if (cid !== conversationId) return;
    handlers.onTypingStart(userId);
  };

  const onTypingStop = ({ conversationId: cid, userId }: { conversationId: string; userId: string }) => {
    if (cid !== conversationId) return;
    handlers.onTypingStop(userId);
  };

  socket.on('connect', onReconnect);
  socket.on('message:new', onNewMessage);
  socket.on('message:updated', onEdited);
  socket.on('message:deleted', onDeleted);
  socket.on('conversation:read', onConversationRead);
  socket.on('message:reaction', onReaction);
  socket.on('typing:start', onTypingStart);
  socket.on('typing:stop', onTypingStop);

  return () => {
    socket.off('connect', onReconnect);
    socket.off('message:new', onNewMessage);
    socket.off('message:updated', onEdited);
    socket.off('message:deleted', onDeleted);
    socket.off('conversation:read', onConversationRead);
    socket.off('message:reaction', onReaction);
    socket.off('typing:start', onTypingStart);
    socket.off('typing:stop', onTypingStop);
  };
}
