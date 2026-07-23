'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * True after hydration, false during SSR/first client render — the idiomatic
 * (lint-clean) replacement for the `useEffect(() => setMounted(true))` pattern.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
