import { describe, expect, it } from 'vitest';
import {
  localizedPath,
  stripLocalePrefix,
  switchLocalePath,
  getLocaleFromPathname,
  isLocalizedPath,
} from '@/i18n/routing';

describe('i18n routing', () => {
  it('prefixes bare paths with locale', () => {
    expect(localizedPath('/', 'en')).toBe('/en');
    expect(localizedPath('/chat', 'tr')).toBe('/tr/chat');
    expect(localizedPath('/login', 'en')).toBe('/en/login');
  });

  it('strips locale prefix', () => {
    expect(stripLocalePrefix('/en')).toBe('/');
    expect(stripLocalePrefix('/tr/chat')).toBe('/chat');
    expect(stripLocalePrefix('/en/login')).toBe('/login');
  });

  it('switches locale while keeping path', () => {
    expect(switchLocalePath('/en/login', 'tr')).toBe('/tr/login');
    expect(switchLocalePath('/tr/chat', 'en')).toBe('/en/chat');
  });

  it('reads locale from pathname', () => {
    expect(getLocaleFromPathname('/tr/register')).toBe('tr');
    expect(getLocaleFromPathname('/login')).toBeNull();
  });

  it('detects localized paths', () => {
    expect(isLocalizedPath('/en/chat')).toBe(true);
    expect(isLocalizedPath('/tr')).toBe(true);
    expect(isLocalizedPath('/login')).toBe(false);
  });
});
