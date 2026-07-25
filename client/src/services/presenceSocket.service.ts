import { connectSocket } from '@/lib/socket';

export interface PresenceUpdate {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

export function subscribePresenceSocket(onUpdate: (update: PresenceUpdate) => void): () => void {
  const socket = connectSocket();

  const handlePresence = (payload: PresenceUpdate) => onUpdate(payload);

  socket.on('presence:update', handlePresence);
  return () => {
    socket.off('presence:update', handlePresence);
  };
}
