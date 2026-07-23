'use client';

import { useEffect } from 'react';

/**
 * Dismiss popovers on outside pointerdown or Escape. Elements that belong to a
 * popover (its trigger + panel) opt out by carrying `data-dismiss-root` — a
 * pointerdown inside any such element is NOT treated as "outside".
 */
export function useDismiss(active: boolean, onDismiss: () => void): void {
  useEffect(() => {
    if (!active) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Element | null;
      if (target?.closest?.('[data-dismiss-root]')) return;
      onDismiss();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss();
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [active, onDismiss]);
}
