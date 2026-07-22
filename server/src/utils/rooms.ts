import { Types } from 'mongoose';

/**
 * Per-user Socket.io room — the ONLY room a socket ever joins (on connect).
 *
 * Delivery is addressed by user id, never by per-conversation rooms: room
 * membership would be derived state that has to be hand-synced with the DB on
 * every membership change, and any missed sync silently drops events. Resolving
 * recipients from ConversationMember at send time keeps the database as the
 * single source of truth.
 */
export function userRoom(id: Types.ObjectId | string): string {
  return `user:${id.toString()}`;
}

/** Rooms for a set of users; pass to `io.to(...)` to fan out once to each. */
export function userRooms(ids: Array<Types.ObjectId | string>): string[] {
  return ids.map(userRoom);
}
