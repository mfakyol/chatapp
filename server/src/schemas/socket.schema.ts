import { z } from 'zod';
import { objectId } from './common';

export const socketConversationId = z.object({
  conversationId: objectId,
});
