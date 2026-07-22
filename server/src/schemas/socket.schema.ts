import { z } from 'zod';
import { objectId } from './common';

/**
 * Payload schema for the only inbound socket events (typing relay). Everything
 * else is REST — sockets are a downstream delivery channel.
 */
export const socketConversationId = z.object({
  conversationId: objectId,
});
