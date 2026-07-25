import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { createPageMetadata } from '@/i18n/metadata';
import { isValidLocale } from '@/i18n/routing';
import type { Locale } from '@/i18n/locales';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  return createPageMetadata(locale as Locale, 'register');
}

export default function RegisterPage() {
  return <RegisterForm />;
}
