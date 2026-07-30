import { io, Socket } from "socket.io-client";

import { SERVER_ORIGIN } from "@/lib/api";

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket) return socket;
  socket = io(SERVER_ORIGIN, { withCredentials: true });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
