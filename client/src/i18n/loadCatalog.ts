import { loadLocaleCatalog, type Locale, type Messages } from '@/i18n/locales';
import { en } from '@/i18n/locales/en';

const cache: Partial<Record<Locale, Messages>> = { en };


export async function loadCatalog(locale: Locale): Promise<Messages> {
  const cached = cache[locale];
  if (cached) return cached;

  const messages = await loadLocaleCatalog(locale);
  cache[locale] = messages;
  return messages;
}
