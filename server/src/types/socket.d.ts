import type { UserDocument } from '../models/User';

declare module 'socket.io' {
  interface Socket {
    user: UserDocument;
  }
}

export {};
