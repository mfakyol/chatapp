import type { UserDocument } from '../models/User';

// The Socket.io handshake middleware authenticates the connection and attaches
// the resolved user document to the socket for every subsequent handler.
declare module 'socket.io' {
  interface Socket {
    user: UserDocument;
  }
}

export {};
