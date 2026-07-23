'use client';

import { IconMoon, IconSun } from '@tabler/icons-react';
import { useThemeStore } from '@/stores/theme.store';
import { useHydrated } from '@/hooks/useHydrated';
import { t } from '@/i18n';

/** Dark/light theme switch. Hydration-safe: renders the dark icon until mounted. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const hydrated = useHydrated();

  const isDark = !hydrated || theme === 'dark';
  const label = isDark ? t('common.themeLight') : t('common.themeDark');

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={className ?? 'rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}
    >
      {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
    </button>
  );
}
