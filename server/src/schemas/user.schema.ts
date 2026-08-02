import { z } from 'zod';
import { objectId, username } from './common';

export const searchUsersSchema = z.object({
  query: z.object({ q: z.string().trim().optional() }),
});

export const usernameParamSchema = z.object({
  params: z.object({ username }),
});

export const userIdParamSchema = z.object({
  params: z.object({ userId: objectId }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    bio: z.string().trim().max(160, 'Bio must be at most 160 characters'),
  }),
});
