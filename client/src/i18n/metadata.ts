import type { Metadata } from 'next';
import { loadCatalog } from '@/i18n/loadCatalog';
import { LOCALES, getLocaleDefinition, type Locale } from '@/i18n/locales';
import { localizedPath } from '@/i18n/routing';

export type SeoPage = 'home' | 'login' | 'register' | 'chat';

const PAGE_PATHS: Record<SeoPage, string> = {
  home: '/',
  login: '/login',
  register: '/register',
  chat: '/chat',
};

const PAGE_ROBOTS: Record<SeoPage, Metadata['robots']> = {
  home: { index: true, follow: true },
  login: { index: true, follow: true },
  register: { index: true, follow: true },
  chat: { index: false, follow: false },
};

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

function absoluteLocalizedPath(path: string, locale: Locale): string {
  return `${siteUrl()}${localizedPath(path, locale)}`;
}

export async function createPageMetadata(locale: Locale, page: SeoPage): Promise<Metadata> {
  const messages = await loadCatalog(locale);
  const meta = messages.meta[page];
  const path = PAGE_PATHS[page];
  const url = absoluteLocalizedPath(path, locale);
  const alternateLocales = LOCALES.filter((code) => code !== locale);

  const languages = Object.fromEntries(
    LOCALES.map((code) => [code, absoluteLocalizedPath(path, code)])
  );

  return {
    title: meta.title,
    description: meta.description,
    keywords: [...meta.keywords],
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url,
      siteName: messages.common.brand,
      locale: getLocaleDefinition(locale).ogLocale,
      alternateLocale: alternateLocales.map((code) => getLocaleDefinition(code).ogLocale),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
    },
    robots: PAGE_ROBOTS[page],
  };
}
