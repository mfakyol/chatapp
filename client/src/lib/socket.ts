import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socket: Socket | null = null;

/**
 * Single shared socket. Auth rides on the httpOnly session cookie
 * (`withCredentials`) — the handshake is verified server-side by the same
 * session middleware as REST.
 */
export function connectSocket(): Socket {
  if (socket) return socket;
  socket = io(SOCKET_URL, { withCredentials: true });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
