import { DEFAULT_LOCALE, LOCALES, detectLocaleFromLanguageTag, type Locale } from '@/i18n/locales';

export { DEFAULT_LOCALE, LOCALES };

export function isValidLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}


export function isLocalizedPath(path: string): boolean {
  const pattern = LOCALES.map((locale) => locale.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`^/(${pattern})(/|$)`).test(path);
}


export function stripLocalePrefix(pathname: string): string {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}`) return '/';
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1) || '/';
    }
  }
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}


export function localizedPath(path: string, locale: Locale): string {
  const bare = stripLocalePrefix(path.startsWith('/') ? path : `/${path}`);
  if (bare === '/') return `/${locale}`;
  return `/${locale}${bare}`;
}


export function switchLocalePath(pathname: string, locale: Locale): string {
  return localizedPath(stripLocalePrefix(pathname), locale);
}

export function getLocaleFromPathname(pathname: string): Locale | null {
  const segment = pathname.split('/')[1];
  return segment && isValidLocale(segment) ? segment : null;
}

export function detectFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const primary = header.split(',')[0]?.trim() ?? '';
  return detectLocaleFromLanguageTag(primary) ?? DEFAULT_LOCALE;
}

export function resolveRequestLocale(
  pathname: string,
  cookieLocale: string | undefined,
  acceptLanguage: string | null
): Locale {
  const fromPath = getLocaleFromPathname(pathname);
  if (fromPath) return fromPath;
  if (cookieLocale && isValidLocale(cookieLocale)) return cookieLocale;
  return detectFromAcceptLanguage(acceptLanguage);
}
