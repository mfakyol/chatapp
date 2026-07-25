import { connectSocket } from '@/lib/socket';
import { PublicUser } from '@/types';

export interface FriendSocketHandlers {
  onRequest: (user: PublicUser) => void;
  onAccepted: (user: PublicUser) => void;
  onDeclined: (user: PublicUser) => void;
  onRemoved: (user: PublicUser) => void;
}

export function subscribeFriendSocket(handlers: FriendSocketHandlers): () => void {
  const socket = connectSocket();

  const onRequest = ({ user }: { user: PublicUser }) => handlers.onRequest(user);
  const onAccepted = ({ user }: { user: PublicUser }) => handlers.onAccepted(user);
  const onDeclined = ({ user }: { user: PublicUser }) => handlers.onDeclined(user);
  const onRemoved = ({ user }: { user: PublicUser }) => handlers.onRemoved(user);

  socket.on('friend:request', onRequest);
  socket.on('friend:accepted', onAccepted);
  socket.on('friend:declined', onDeclined);
  socket.on('friend:removed', onRemoved);

  return () => {
    socket.off('friend:request', onRequest);
    socket.off('friend:accepted', onAccepted);
    socket.off('friend:declined', onDeclined);
    socket.off('friend:removed', onRemoved);
  };
}
