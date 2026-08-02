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
      .min(1, 'At least 1 other member is required'),
  }),
});

export const conversationIdParamSchema = z.object({
  params: z.object({ conversationId: objectId }),
});

export const sendMessageSchema = z.object({
  params: z.object({ conversationId: objectId }),
  body: z.object({
    content: z.string().trim().min(1, 'Content is required').max(4000),
    replyTo: objectId.optional(),
    clientTempId: z.string().trim().min(1).max(64).optional(),
  }),
});

export const messageParamsSchema = z.object({
  params: z.object({ conversationId: objectId, messageId: objectId }),
});

export const editMessageSchema = z.object({
  params: z.object({ conversationId: objectId, messageId: objectId }),
  body: z.object({ content: z.string().trim().min(1, 'Content is required').max(4000) }),
});

export const reactSchema = z.object({
  params: z.object({ conversationId: objectId, messageId: objectId }),
  body: z.object({ emoji: z.string().trim().min(1).max(16) }),
});

export const renameSchema = z.object({
  params: z.object({ conversationId: objectId }),
  body: z
    .object({
      name: z.string().trim().min(1, 'Name is required').optional(),
      description: z
        .string()
        .trim()
        .max(500, 'Description must be at most 500 characters')
        .optional(),
    })
    .refine((body) => body.name !== undefined || body.description !== undefined, {
      message: 'Nothing to update',
    }),
});

export const setMemberRoleSchema = z.object({
  params: z.object({ conversationId: objectId, username }),
  body: z.object({ role: z.enum(['admin', 'member']) }),
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
