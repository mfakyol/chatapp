'use client';

import { useEffect } from 'react';
import { subscribePresenceSocket } from '@/services/presenceSocket.service';
import { usePresenceStore } from '@/stores/presence.store';


export function usePresenceSocket(enabled = true) {
  const setPresence = usePresenceStore((s) => s.setPresence);

  useEffect(() => {
    if (!enabled) return;
    return subscribePresenceSocket(({ userId, isOnline, lastSeen }) => {
      setPresence(userId, { isOnline, lastSeen });
    });
  }, [enabled, setPresence]);
}
