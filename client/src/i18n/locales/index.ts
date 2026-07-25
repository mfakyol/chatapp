import { en } from '@/i18n/locales/en';
import {
  DEFAULT_LOCALE,
  detectLocaleFromLanguageTag,
  type Locale,
} from '@/i18n/locales/config';

export {
  DEFAULT_LOCALE,
  LOCALE_REGISTRY,
  LOCALES,
  detectLocaleFromLanguageTag,
  getLocaleDefinition,
  loadLocaleCatalog,
  type Locale,
} from '@/i18n/locales/config';

type Stringify<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Stringify<U>[]
    : T extends object
      ? { [K in keyof T]: Stringify<T[K]> }
      : string;

export type Messages = Stringify<typeof en>;

export { en };

export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  return detectLocaleFromLanguageTag(navigator.language) ?? DEFAULT_LOCALE;
}
