import { z } from 'zod';
import { USERNAME_REGEX } from '../models/User';

export const registerSchema = z.object({
  body: z.object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        USERNAME_REGEX,
        'Username must be 3-20 characters, lowercase letters, numbers, - and _ only'
      ),
    email: z.string().trim().toLowerCase().email('A valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(1, 'Identifier is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export type RegisterBody = z.infer<typeof registerSchema>['body'];
