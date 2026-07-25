import { notFound } from 'next/navigation';
import AuthBootstrap from '@/components/AuthBootstrap';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { isValidLocale } from '@/i18n/routing';
import { LOCALES, type Locale } from '@/i18n/locales';

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  return (
    <LocaleProvider locale={locale as Locale}>
      <AuthBootstrap />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </LocaleProvider>
  );
}
