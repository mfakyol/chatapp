import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useThemeStore } from '@/stores/theme.store';

export function useColorScheme(): 'light' | 'dark' {
  const system = useSystemColorScheme();
  const preference = useThemeStore((s) => s.preference);
  if (preference !== 'system') return preference;
  return system ?? 'light';
}
