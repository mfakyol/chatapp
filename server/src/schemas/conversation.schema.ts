import { z } from 'zod';
import { objectId, username } from './common';

export const createDirectSchema = z.object({
  body: z.object({ username }),
});

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Group name is required'),
    usernames: z
      .array(z.string().trim().toLowerCase())
      .min(2, 'At least 2 other members are required'),
  }),
});

export const conversationIdParamSchema = z.object({
  params: z.object({ conversationId: objectId }),
});

export const messageParamsSchema = z.object({
  params: z.object({ conversationId: objectId, messageId: objectId }),
});

export const editMessageSchema = z.object({
  params: z.object({ conversationId: objectId, messageId: objectId }),
  body: z.object({ content: z.string().trim().min(1, 'Content is required') }),
});

export const renameSchema = z.object({
  params: z.object({ conversationId: objectId }),
  body: z.object({ name: z.string().trim().min(1, 'Name is required') }),
});

export const addMemberSchema = z.object({
  params: z.object({ conversationId: objectId }),
  body: z.object({ username }),
});

export const removeMemberSchema = z.object({
  params: z.object({ conversationId: objectId, username }),
});

export const getMessagesSchema = z.object({
  params: z.object({ conversationId: objectId }),
  query: z.object({
    limit: z.string().regex(/^\d+$/, 'limit must be a number').optional(),
    around: objectId.optional(),
    before: z.string().optional(),
  }),
});

export const searchMessagesSchema = z.object({
  query: z.object({
    q: z.string().trim().optional(),
    conversationId: objectId.optional(),
  }),
});

export type CreateGroupBody = z.infer<typeof createGroupSchema>['body'];
