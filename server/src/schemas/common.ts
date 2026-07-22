import { z } from 'zod';
import { Types } from 'mongoose';

/** A string that must be a valid Mongo ObjectId. */
export const objectId = z
  .string()
  .refine((v) => Types.ObjectId.isValid(v), { message: 'Invalid id' });

/** A username reference (looked up case-insensitively). */
export const username = z.string().trim().toLowerCase().min(1, 'Username is required');
