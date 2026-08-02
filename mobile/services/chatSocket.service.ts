import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { useChatStore } from "@/stores/chat.store";
import type { Conversation, Message, Reaction } from "@/types";

function store() {
  return useChatStore.getState();
}

const TYPING_TTL_MS = 6000;
const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

interface TypingPayload {
  conversationId: string;
  userId: string;
}

function clearTypingTimer(key: string) {
  const timer = typingTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    typingTimers.delete(key);
  }
}

export function emitTyping(conversationId: string, active: boolean): void {
  getSocket()?.emit(active ? "typing:start" : "typing:stop", { conversationId });
}

export function subscribeChatSocket(currentUsername: string): () => void {
  const socket = connectSocket();

  let everConnected = socket.connected;
  const onConnect = () => {
    if (!everConnected) {
      everConnected = true;
      return;
    }
    store().loadConversations();
  };

  const onNewMessage = ({ message }: { message: Message }) => {
    store().applyIncomingMessage(message, message.sender.username === currentUsername);
  };

  const onMessageUpdated = ({ message }: { message: Message }) => {
    store().applyMessageUpdated(message);
  };

  const onMessageDeleted = ({
    conversationId,
    messageId,
  }: {
    conversationId: string;
    messageId: string;
  }) => {
    store().applyMessageDeleted(conversationId, messageId);
  };

  const onMessageReaction = ({
    conversationId,
    messageId,
    reactions,
  }: {
    conversationId: string;
    messageId: string;
    reactions: Reaction[];
  }) => {
    store().applyMessageReaction(conversationId, messageId, reactions);
  };

  const onTypingStart = ({ conversationId, userId }: TypingPayload) => {
    const uid = String(userId);
    store().setTyping(conversationId, uid, true);
    const key = `${conversationId}:${uid}`;
    clearTypingTimer(key);
    typingTimers.set(
      key,
      setTimeout(() => {
        typingTimers.delete(key);
        store().setTyping(conversationId, uid, false);
      }, TYPING_TTL_MS),
    );
  };

  const onTypingStop = ({ conversationId, userId }: TypingPayload) => {
    const uid = String(userId);
    clearTypingTimer(`${conversationId}:${uid}`);
    store().setTyping(conversationId, uid, false);
  };

  const onConversationNew = ({ conversation }: { conversation: Conversation }) => {
    store().upsertConversation(conversation);
  };

  const onConversationUpdated = ({ conversation }: { conversation: Conversation }) => {
    store().upsertConversation(conversation);
  };

  const onConversationDeleted = ({ conversationId }: { conversationId: string }) => {
    store().removeConversation(conversationId);
  };

  socket.on("connect", onConnect);
  socket.on("typing:start", onTypingStart);
  socket.on("typing:stop", onTypingStop);
  socket.on("message:new", onNewMessage);
  socket.on("message:updated", onMessageUpdated);
  socket.on("message:deleted", onMessageDeleted);
  socket.on("message:reaction", onMessageReaction);
  socket.on("conversation:new", onConversationNew);
  socket.on("conversation:updated", onConversationUpdated);
  socket.on("conversation:deleted", onConversationDeleted);

  return () => {
    for (const key of typingTimers.keys()) clearTypingTimer(key);
    socket.off("connect", onConnect);
    socket.off("typing:start", onTypingStart);
    socket.off("typing:stop", onTypingStop);
    socket.off("message:new", onNewMessage);
    socket.off("message:updated", onMessageUpdated);
    socket.off("message:deleted", onMessageDeleted);
    socket.off("message:reaction", onMessageReaction);
    socket.off("conversation:new", onConversationNew);
    socket.off("conversation:updated", onConversationUpdated);
    socket.off("conversation:deleted", onConversationDeleted);
    disconnectSocket();
  };
}
