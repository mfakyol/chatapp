import { z } from 'zod';
import { objectId } from './common';

/** Payload schemas for inbound Socket.io events. */
export const socketMessageSend = z.object({
  conversationId: objectId,
  content: z.string().trim().min(1),
});

export const socketConversationId = z.object({
  conversationId: objectId,
});
