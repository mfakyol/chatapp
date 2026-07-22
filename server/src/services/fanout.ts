import type { Server } from 'socket.io';
import { Types } from 'mongoose';
import ConversationMember from '../models/ConversationMember';
import { userRooms } from '../utils/rooms';

/** Current member user-ids of a conversation, resolved from the database. */
export async function conversationMemberIds(
  conversationId: Types.ObjectId | string
): Promise<string[]> {
  const members = await ConversationMember.find({ conversation: conversationId }).select('user');
  return members.map((m) => m.user.toString());
}

/**
 * The single fan-out point: emit an event to every member of a conversation,
 * addressed to their per-user rooms. Recipients are always resolved from the DB
 * at send time — there is no room membership to keep in sync.
 */
export async function broadcastToConversation(
  io: Server,
  conversationId: Types.ObjectId | string,
  event: string,
  payload: unknown,
  opts: { except?: Types.ObjectId | string } = {}
): Promise<void> {
  let ids = await conversationMemberIds(conversationId);
  if (opts.except) {
    const except = opts.except.toString();
    ids = ids.filter((id) => id !== except);
  }
  if (ids.length > 0) io.to(userRooms(ids)).emit(event, payload);
}
