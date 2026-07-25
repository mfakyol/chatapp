import { z } from 'zod';
import { Types } from 'mongoose';

export const objectId = z
  .string()
  .refine((v) => Types.ObjectId.isValid(v), { message: 'Invalid id' });

export const username = z.string().trim().toLowerCase().min(1, 'Username is required');
