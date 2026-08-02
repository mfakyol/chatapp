import { z } from 'zod';
import { translate } from '@/i18n/translate';
import type { Messages } from '@/i18n/locales';

export function createNewGroupSchema(catalog: Messages) {
  const message = translate(catalog, 'sidebar.errGroupRequirements');

  return z
    .object({
      name: z.string(),
      members: z.array(z.string()),
    })
    .refine((data) => data.name.trim().length > 0 && data.members.length >= 1, {
      message,
      path: ['name'],
    })
    .transform((data) => ({
      name: data.name.trim(),
      members: data.members,
    }));
}

export type NewGroupFormValues = z.infer<ReturnType<typeof createNewGroupSchema>>;
