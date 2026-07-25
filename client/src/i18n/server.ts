import { cache } from 'react';
import { translate, type Translator } from '@/i18n/translate';
import { loadCatalog } from '@/i18n/loadCatalog';
import type { Locale } from '@/i18n/locales';

export type { Translator };

export const getServerI18n = cache(async (locale: Locale) => {
  const messages = await loadCatalog(locale);
  return { messages, t: (key: string, params?: Record<string, string | number>) => translate(messages, key, params) };
});
