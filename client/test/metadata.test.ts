import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/locales';
import { tr } from '@/i18n/locales/tr';

describe('SEO meta translations', () => {
  it('defines home, login, register and chat meta for English', () => {
    expect(en.meta.home.title).toContain('ChatApp');
    expect(en.meta.login.description.length).toBeGreaterThan(20);
    expect(en.meta.register.keywords.length).toBeGreaterThan(0);
    expect(en.meta.chat.title).toContain('ChatApp');
  });

  it('defines home, login, register and chat meta for Turkish', () => {
    expect(tr.meta.home.title).toContain('ChatApp');
    expect(tr.meta.login.description.length).toBeGreaterThan(20);
    expect(tr.meta.register.keywords.length).toBeGreaterThan(0);
    expect(tr.meta.chat.title).toContain('ChatApp');
  });
});
