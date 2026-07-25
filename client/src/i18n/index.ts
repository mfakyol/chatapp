import type { Locale, Messages } from '@/i18n/locales';
import { getActiveMessages } from '@/contexts/LocaleContext';
import { translate } from '@/i18n/translate';

type Params = Record<string, string | number>;

export { translate } from '@/i18n/translate';
export { useT } from '@/hooks/useT';


export function t(key: string, params?: Params): string {
  return translate(getActiveMessages(), key, params);
}

export { loadCatalog } from '@/i18n/loadCatalog';
export type { Locale, Messages };
