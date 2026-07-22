import { Types } from 'mongoose';

/** Per-user Socket.io room, used to push events to every device of one user. */
export function userRoom(id: Types.ObjectId | string): string {
  return `user:${id.toString()}`;
}
