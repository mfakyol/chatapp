'use client';

import { usePresenceStore, PresenceEntry } from '@/stores/presence.store';

export function usePresenceMap(): Record<string, PresenceEntry> {
  return usePresenceStore((s) => s.presence);
}

export function usePresence(userId?: string): PresenceEntry | undefined {
  return usePresenceStore((s) => (userId ? s.presence[userId] : undefined));
}
