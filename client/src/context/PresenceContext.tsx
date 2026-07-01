'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSocket } from '@/lib/socket';

interface PresenceEntry {
  isOnline: boolean;
  lastSeen?: string;
}

interface PresenceMap {
  [userId: string]: PresenceEntry;
}

const PresenceContext = createContext<PresenceMap>({});

export function PresenceProvider({ children }: { children: ReactNode }) {
  const [presence, setPresence] = useState<PresenceMap>({});

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
      setPresence((prev) => ({ ...prev, [userId]: { isOnline, lastSeen } }));
    }

    socket.on('presence:update', handlePresence);
    return () => {
      socket.off('presence:update', handlePresence);
    };
  }, []);

  return <PresenceContext.Provider value={presence}>{children}</PresenceContext.Provider>;
}

export function usePresence(userId?: string): PresenceEntry | undefined {
  const presence = useContext(PresenceContext);
  return userId ? presence[userId] : undefined;
}

export function usePresenceMap(): PresenceMap {
  return useContext(PresenceContext);
}
