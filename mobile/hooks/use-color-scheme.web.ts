import { useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useThemeStore } from '@/stores/theme.store';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const system = useSystemColorScheme();
  const preference = useThemeStore((s) => s.preference);

  if (preference !== 'system') return preference;
  if (!hasHydrated) return 'light';
  return system ?? 'light';
}
