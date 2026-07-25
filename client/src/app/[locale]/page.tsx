import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HomeCta } from '@/components/home/HomeCta';
import { HomeFeatures } from '@/components/home/HomeFeatures';
import { HomeFooter } from '@/components/home/HomeFooter';
import { HomeHero } from '@/components/home/HomeHero';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { createPageMetadata } from '@/i18n/metadata';
import { getServerI18n } from '@/i18n/server';
import { isValidLocale } from '@/i18n/routing';
import type { Locale } from '@/i18n/locales';
import { getServerUser } from '@/lib/server/auth';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  return createPageMetadata(locale as Locale, 'home');
}

export default async function Page({ params }: PageProps) {
  const { locale: localeParam } = await params;
  if (!isValidLocale(localeParam)) notFound();

  const locale = localeParam as Locale;
  const [{ t }, user] = await Promise.all([getServerI18n(locale), getServerUser()]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-(--bg-app) text-(--text-normal)">
      <SiteHeader />
      <HomeHero t={t} user={user} />
      <HomeFeatures t={t} />
      <HomeCta t={t} user={user} />
      <HomeFooter t={t} />
    </div>
  );
}
