import { beforeEach, describe, it, expect } from 'vitest';
import { t } from '@/i18n';
import { en, type Messages } from '@/i18n/locales';
import { tr } from '@/i18n/locales/tr';
import { setLocaleRuntimeForTests } from '@/contexts/LocaleContext';

describe('t()', () => {
  beforeEach(() => {
    setLocaleRuntimeForTests('en', en);
  });

  it('resolves a dotted key', () => {
    expect(t('login.title')).toBe('Welcome back');
  });

  it('interpolates params', () => {
    expect(t('profile.membersCount', { count: 3 })).toBe('3 members');
    expect(t('sidebar.toastRequest', { name: 'Ada' })).toBe('Ada sent you a friend request');
  });

  it('returns the key itself when unresolved', () => {
    expect(t('does.not.exist')).toBe('does.not.exist');
  });

  it('uses Turkish catalog when locale is tr', () => {
    setLocaleRuntimeForTests('tr', tr as Messages);
    expect(t('login.title')).toBe('Tekrar hoş geldin');
  });
});
