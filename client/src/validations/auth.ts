import { z } from 'zod';
import { translate } from '@/i18n/translate';
import type { Messages } from '@/i18n/locales';
import { MIN_PASSWORD_LENGTH, USERNAME_REGEX } from '@/validations/constants';


export function createLoginSchema(catalog: Messages) {
  return z.object({
    identifier: z.string().trim().min(1, translate(catalog, 'login.errEmptyIdentifier')),
    password: z.string().min(1, translate(catalog, 'login.errEmptyPassword')),
  });
}

export function createRegisterSchema(catalog: Messages) {
  return z.object({
    firstName: z.string().trim().min(1, translate(catalog, 'register.errRequired')),
    lastName: z.string().trim().min(1, translate(catalog, 'register.errRequired')),
    username: z
      .string()
      .trim()
      .min(1, translate(catalog, 'register.errRequired'))
      .refine((value) => USERNAME_REGEX.test(value.toLowerCase()), translate(catalog, 'register.errBadUsername'))
      .transform((value) => value.toLowerCase()),
    email: z
      .string()
      .trim()
      .min(1, translate(catalog, 'register.errRequired'))
      .email(translate(catalog, 'register.errBadEmail'))
      .transform((value) => value.toLowerCase()),
    password: z.string().min(MIN_PASSWORD_LENGTH, translate(catalog, 'register.errShortPassword')),
  });
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;
