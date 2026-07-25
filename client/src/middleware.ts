import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  detectFromAcceptLanguage,
  getLocaleFromPathname,
  isValidLocale,
  localizedPath,
  stripLocalePrefix,
} from '@/i18n/routing';
import type { Locale } from '@/i18n/locales';

function preferredLocale(request: NextRequest): Locale {
  const cookie = request.cookies.get('locale')?.value;
  if (cookie && isValidLocale(cookie)) return cookie;
  return detectFromAcceptLanguage(request.headers.get('accept-language'));
}

function redirectToLocalized(request: NextRequest, barePath: string, locale: Locale) {
  const url = request.nextUrl.clone();
  url.pathname = localizedPath(barePath, locale);
  const response = NextResponse.redirect(url);
  response.cookies.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathLocale = getLocaleFromPathname(pathname);

  if (pathLocale) {
    const response = NextResponse.next();
    const cookie = request.cookies.get('locale')?.value;
    if (cookie !== pathLocale) {
      response.cookies.set('locale', pathLocale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }
    response.headers.set('x-locale', pathLocale);
    return response;
  }

  const firstSegment = pathname.split('/')[1];
  if (firstSegment && firstSegment.length === 2) {
    const rest = pathname.slice(firstSegment.length + 1) || '/';
    return redirectToLocalized(request, rest, preferredLocale(request));
  }

  return redirectToLocalized(request, stripLocalePrefix(pathname), preferredLocale(request));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
