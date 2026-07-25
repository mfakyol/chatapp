'use client';

import { useContext } from 'react';
import { LocaleContext } from '@/contexts/LocaleContext';
import type { Locale, Messages } from '@/i18n/locales';
import { translate } from '@/i18n/translate';

type Params = Record<string, string | number>;

export function useT(): {
  t: (key: string, params?: Params) => string;
  locale: Locale;
  messages: Messages;
} {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useT must be used within LocaleProvider');
  const { locale, messages } = value;
  return {
    t: (key, params) => translate(messages, key, params),
    locale,
    messages,
  };
}
