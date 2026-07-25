'use client';

import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loadCatalog } from '@/i18n/loadCatalog';
import { en, DEFAULT_LOCALE, type Locale, type Messages } from '@/i18n/locales';

export type LocaleState = {
  locale: Locale;
  messages: Messages;
  ready: boolean;
};

export const LocaleContext = createContext<LocaleState | null>(null);

const STORAGE_KEY = 'locale';

let runtimeLocale: Locale = DEFAULT_LOCALE;
let runtimeMessages: Messages = en;

function applyLocale(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  document.documentElement.setAttribute('data-locale', locale);
  try {
    localStorage.setItem(STORAGE_KEY, locale);
    document.cookie = `locale=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
  } catch {}
}

export function getLocale(): Locale {
  return runtimeLocale;
}

export function getActiveMessages(): Messages {
  return runtimeMessages;
}

export function setLocaleRuntimeForTests(locale: Locale, messages: Messages): void {
  runtimeLocale = locale;
  runtimeMessages = messages;
}

export function LocaleProvider({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const [state, setState] = useState<{
    locale: Locale;
    messages: Messages;
    ready: boolean;
  }>({
    locale: DEFAULT_LOCALE,
    messages: en,
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;
    applyLocale(locale);

    void loadCatalog(locale).then((messages) => {
      if (cancelled) return;
      runtimeLocale = locale;
      runtimeMessages = messages;
      setState({ locale, messages, ready: true });
    });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const value = useMemo<LocaleState>(
    () => ({
      locale: state.locale,
      messages: state.messages,
      ready: state.ready,
    }),
    [state]
  );

  if (!state.ready || state.locale !== locale) return null;

  return (
    <LocaleContext.Provider value={value}>
      <div key={locale} className="contents">
        {children}
      </div>
    </LocaleContext.Provider>
  );
}
