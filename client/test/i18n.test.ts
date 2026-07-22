import { describe, it, expect } from 'vitest';
import { t } from '@/i18n';

describe('t()', () => {
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
});
