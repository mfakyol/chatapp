import { en } from '@/i18n/locales/en';

type LocaleCatalog = typeof en;

type LocaleDefinition<C extends string = string> = {
  code: C;
  shortLabel: string;
  ogLocale: string;
  dateLocale: string;
  acceptLanguagePrefixes: readonly string[];
  catalog?: LocaleCatalog;
  loadCatalog?: () => Promise<LocaleCatalog>;
};

export const LOCALE_REGISTRY = [
  {
    code: 'en',
    shortLabel: 'EN',
    ogLocale: 'en_US',
    dateLocale: 'en-US',
    acceptLanguagePrefixes: ['en'],
    catalog: en,
  },
  {
    code: 'tr',
    shortLabel: 'TR',
    ogLocale: 'tr_TR',
    dateLocale: 'tr-TR',
    acceptLanguagePrefixes: ['tr'],
    loadCatalog: () =>
      import('@/i18n/locales/tr').then((mod) => mod.tr as unknown as LocaleCatalog),
  },
] as const satisfies readonly LocaleDefinition[];

export type Locale = (typeof LOCALE_REGISTRY)[number]['code'];

export const LOCALES: Locale[] = LOCALE_REGISTRY.map((entry) => entry.code);

export const DEFAULT_LOCALE: Locale = LOCALE_REGISTRY[0].code;

export function getLocaleDefinition(code: Locale) {
  const entry = LOCALE_REGISTRY.find((item) => item.code === code);
  if (!entry) throw new Error(`Unknown locale: ${code}`);
  return entry;
}

export function getBundledCatalog(code: Locale): LocaleCatalog | undefined {
  const entry = getLocaleDefinition(code);
  return 'catalog' in entry ? entry.catalog : undefined;
}

export async function loadLocaleCatalog(code: Locale): Promise<LocaleCatalog> {
  const bundled = getBundledCatalog(code);
  if (bundled) return bundled;

  const entry = getLocaleDefinition(code);
  if ('loadCatalog' in entry && entry.loadCatalog) {
    return entry.loadCatalog();
  }

  return getBundledCatalog(DEFAULT_LOCALE)!;
}

export function detectLocaleFromLanguageTag(language: string): Locale | null {
  const tag = language.trim().toLowerCase();
  for (const entry of LOCALE_REGISTRY) {
    if (entry.acceptLanguagePrefixes.some((prefix) => tag.startsWith(prefix))) {
      return entry.code;
    }
  }
  return null;
}
