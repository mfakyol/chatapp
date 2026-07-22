import { z } from 'zod';
import { username } from './common';

export const searchUsersSchema = z.object({
  query: z.object({ q: z.string().trim().optional() }),
});

export const usernameParamSchema = z.object({
  params: z.object({ username }),
});
