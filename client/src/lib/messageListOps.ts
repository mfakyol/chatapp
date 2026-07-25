import { Message } from "@/types";

export function upsertMessage(list: Message[], message: Message): Message[] {
  if (message.clientTempId) {
    const idx = list.findIndex(
      (m) =>
        m.clientTempId === message.clientTempId ||
        m._id === message.clientTempId,
    );
    if (idx >= 0) {
      const next = [...list];
      next[idx] = message;
      return next;
    }
  }
  if (list.some((m) => m._id === message._id)) {
    return list.map((m) => (m._id === message._id ? message : m));
  }
  return [...list, message];
}

export function markDeleted(list: Message[], messageId: string): Message[] {
  return list.map((m) =>
    m._id === messageId
      ? {
          ...m,
          content: "",
          attachment: undefined,
          deletedAt: new Date().toISOString(),
        }
      : m,
  );
}

export function replaceMessage(
  list: Message[],
  messageId: string,
  message: Message,
): Message[] {
  return list.map((m) => (m._id === messageId ? message : m));
}

export function setReactions(
  list: Message[],
  messageId: string,
  reactions: Message["reactions"],
): Message[] {
  return list.map((m) => (m._id === messageId ? { ...m, reactions } : m));
}
