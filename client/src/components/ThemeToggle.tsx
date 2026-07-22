'use client';

import { useEffect, useState } from 'react';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useThemeStore } from '@/stores/theme.store';
import { t } from '@/i18n';

/** Dark/light theme switch. Guards against hydration mismatch with `mounted`. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = !mounted || theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? t('common.themeLight') : t('common.themeDark')}
      className={className ?? 'rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}
    >
      {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
    </button>
  );
}
