'use client';

import { useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { usePresenceStore } from '@/stores/presence.store';

/** Subscribes to presence:update socket events and mirrors them into the store. */
export default function PresenceListener() {
  const setPresence = usePresenceStore((s) => s.setPresence);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handlePresence({
      userId,
      isOnline,
      lastSeen,
    }: {
      userId: string;
      isOnline: boolean;
      lastSeen?: string;
    }) {
      setPresence(userId, { isOnline, lastSeen });
    }

    socket.on('presence:update', handlePresence);
    return () => {
      socket.off('presence:update', handlePresence);
    };
  }, [setPresence]);

  return null;
}
