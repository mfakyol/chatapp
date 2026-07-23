import { Message } from '@/types';

/**
 * Pure operations on the message list — extracted so the reconciliation logic
 * is unit-testable instead of living inside component closures.
 */

/**
 * Insert or replace a message. Optimistic bubbles are reconciled via
 * clientTempId (the server echo carries the same id); otherwise updates in
 * place by _id or appends.
 */
export function upsertMessage(list: Message[], message: Message): Message[] {
  if (message.clientTempId) {
    const idx = list.findIndex(
      (m) => m.clientTempId === message.clientTempId || m._id === message.clientTempId
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

/** Soft-delete in place: clear content/attachment, stamp deletedAt. */
export function markDeleted(list: Message[], messageId: string): Message[] {
  return list.map((m) =>
    m._id === messageId
      ? { ...m, content: '', attachment: undefined, deletedAt: new Date().toISOString() }
      : m
  );
}

/** Replace one message (server-confirmed edit). */
export function replaceMessage(list: Message[], messageId: string, message: Message): Message[] {
  return list.map((m) => (m._id === messageId ? message : m));
}

/** Apply a reactions update to one message. */
export function setReactions(
  list: Message[],
  messageId: string,
  reactions: Message['reactions']
): Message[] {
  return list.map((m) => (m._id === messageId ? { ...m, reactions } : m));
}
