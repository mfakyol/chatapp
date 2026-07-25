import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { detectFromAcceptLanguage, isValidLocale, localizedPath } from '@/i18n/routing';
import type { Locale } from '@/i18n/locales';


export default async function RootRedirectPage() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get('locale')?.value;
  const locale: Locale =
    cookie && isValidLocale(cookie) ? cookie : detectFromAcceptLanguage((await headers()).get('accept-language'));

  redirect(localizedPath('/', locale));
}
