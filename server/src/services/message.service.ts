import type { Server } from 'socket.io';
import type { FilterQuery, PopulateOptions } from 'mongoose';
import Conversation from '../models/Conversation';
import Message, { IAttachment, IMessage, MessageDocument } from '../models/Message';
import type { UserDocument } from '../models/User';
import { badRequest, forbidden, notFound } from '../errors/AppError';

const MESSAGE_POPULATE: PopulateOptions[] = [
  { path: 'sender', select: 'username firstName lastName avatarUrl' },
  { path: 'readBy.user', select: 'username firstName lastName' },
];

const SENDER_POPULATE = 'username firstName lastName avatarUrl';

/** Load the conversation and assert the user participates in it. */
async function requireParticipation(user: UserDocument, conversationId: string) {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: user._id,
  });
  if (!conversation) throw notFound('Conversation not found');
  return conversation;
}

export interface GetMessagesOptions {
  limit?: number;
  around?: string;
  before?: string;
}

export async function getMessages(
  user: UserDocument,
  conversationId: string,
  opts: GetMessagesOptions
): Promise<MessageDocument[]> {
  await requireParticipation(user, conversationId);

  const limit = Math.min(opts.limit ?? 50, 100);

  if (opts.around) {
    const target = await Message.findOne({ _id: opts.around, conversation: conversationId });
    if (!target) throw notFound('Message not found');

    const half = Math.floor(limit / 2);
    const [before, after] = await Promise.all([
      Message.find({ conversation: conversationId, createdAt: { $lt: target.createdAt } })
        .sort({ createdAt: -1 })
        .limit(half)
        .populate(MESSAGE_POPULATE),
      Message.find({ conversation: conversationId, createdAt: { $gte: target.createdAt } })
        .sort({ createdAt: 1 })
        .limit(half + 1)
        .populate(MESSAGE_POPULATE),
    ]);

    return [...before.reverse(), ...after];
  }

  const filter: FilterQuery<IMessage> = { conversation: conversationId };
  if (opts.before) filter.createdAt = { $lt: new Date(opts.before) };

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate(MESSAGE_POPULATE);

  return messages.reverse();
}

export async function searchMessages(
  user: UserDocument,
  rawQuery: string,
  conversationId?: string
): Promise<MessageDocument[]> {
  const q = (rawQuery ?? '').trim();
  if (!q) return [];

  let conversationIds;
  if (conversationId) {
    const conversation = await requireParticipation(user, conversationId);
    conversationIds = [conversation._id];
  } else {
    const conversations = await Conversation.find({ participants: user._id }).select('_id');
    conversationIds = conversations.map((c) => c._id);
  }

  return Message.find({
    conversation: { $in: conversationIds },
    content: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('sender', 'username firstName lastName avatarUrl')
    .populate('conversation', 'name isGroup participants');
}

export interface CreateMessageInput {
  content?: string;
  attachment?: IAttachment;
}

/**
 * Persist a message, bump the conversation's `lastMessage`, and broadcast
 * `message:new`. Shared by the REST attachment upload and the socket text path.
 */
export async function createMessage(
  user: UserDocument,
  conversationId: string,
  input: CreateMessageInput,
  io: Server
): Promise<MessageDocument> {
  const conversation = await requireParticipation(user, conversationId);

  const message = await Message.create({
    conversation: conversationId,
    sender: user._id,
    content: input.content?.trim() || '',
    attachment: input.attachment,
    readBy: [{ user: user._id, readAt: new Date() }],
  });

  conversation.lastMessage = message._id;
  await conversation.save();

  const populated = await message.populate('sender', SENDER_POPULATE);
  io.to(conversationId).emit('message:new', { message: populated });
  return populated;
}

export async function editMessage(
  user: UserDocument,
  conversationId: string,
  messageId: string,
  content: string,
  io: Server
): Promise<MessageDocument> {
  const message = await Message.findOne({ _id: messageId, conversation: conversationId });
  if (!message) throw notFound('Message not found');
  if (!message.sender.equals(user._id)) throw forbidden('You can only edit your own messages');
  if (message.deletedAt) throw badRequest('Cannot edit a deleted message');

  message.content = content.trim();
  message.editedAt = new Date();
  await message.save();

  const populated = await message.populate(MESSAGE_POPULATE);
  io.to(conversationId).emit('message:edited', { message: populated });
  return populated;
}

export async function deleteMessage(
  user: UserDocument,
  conversationId: string,
  messageId: string,
  io: Server
): Promise<void> {
  const message = await Message.findOne({ _id: messageId, conversation: conversationId });
  if (!message) throw notFound('Message not found');
  if (!message.sender.equals(user._id)) throw forbidden('You can only delete your own messages');

  message.content = '';
  message.attachment = undefined;
  message.deletedAt = new Date();
  await message.save();

  io.to(conversationId).emit('message:deleted', { conversationId, messageId });
}

/** Mark all of the caller's unread messages in a conversation as read. */
export async function markConversationRead(
  user: UserDocument,
  conversationId: string,
  io: Server
): Promise<void> {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: user._id,
  });
  if (!conversation) return;

  const unread = await Message.find({
    conversation: conversationId,
    sender: { $ne: user._id },
    'readBy.user': { $ne: user._id },
  }).select('_id');
  if (unread.length === 0) return;

  const readAt = new Date();
  const messageIds = unread.map((m) => m._id);

  // The `readBy.user` guard makes this idempotent: a concurrent read call that
  // already recorded this user is a no-op instead of pushing a duplicate receipt.
  await Message.updateMany(
    { _id: { $in: messageIds }, 'readBy.user': { $ne: user._id } },
    { $push: { readBy: { user: user._id, readAt } } }
  );

  io.to(conversationId).emit('message:read', {
    conversationId,
    userId: user._id,
    readAt,
    messageIds,
  });
}
