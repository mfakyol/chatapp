import type { Server } from 'socket.io';
import type { FilterQuery, PopulateOptions } from 'mongoose';
import Conversation from '../models/Conversation';
import ConversationMember from '../models/ConversationMember';
import Message, { IAttachment, IMessage, IReaction, MessageDocument } from '../models/Message';
import type { UserDocument } from '../models/User';
import { badRequest, forbidden, notFound } from '../errors/AppError';
import { requireMembership } from './conversation.service';
import { broadcastToConversation } from './fanout';

const REPLY_POPULATE: PopulateOptions = {
  path: 'replyTo',
  select: 'content attachment sender deletedAt',
  populate: { path: 'sender', select: 'username firstName lastName' },
};

const MESSAGE_POPULATE: PopulateOptions[] = [
  { path: 'sender', select: 'username firstName lastName avatarUrl' },
  REPLY_POPULATE,
];

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
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
  await requireMembership(user, conversationId);

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
    const membership = await requireMembership(user, conversationId);
    conversationIds = [membership.conversation];
  } else {
    const memberships = await ConversationMember.find({ user: user._id }).select('conversation');
    conversationIds = memberships.map((m) => m.conversation);
  }

  return Message.find({
    conversation: { $in: conversationIds },
    content: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('sender', 'username firstName lastName avatarUrl')
    .populate('conversation', 'name type');
}

export interface CreateMessageInput {
  content?: string;
  attachment?: IAttachment;
  replyTo?: string;
  clientTempId?: string;
}

/**
 * Persist a message, bump the conversation's `lastMessage`, and fan out
 * `message:new` to the members resolved at send time. Idempotent on
 * (sender, clientTempId): a retried send returns the already-persisted message.
 */
export async function createMessage(
  user: UserDocument,
  conversationId: string,
  input: CreateMessageInput,
  io: Server
): Promise<MessageDocument> {
  await requireMembership(user, conversationId);

  // Only allow replying to a message in the same conversation.
  let replyTo: string | undefined;
  if (input.replyTo) {
    const target = await Message.exists({ _id: input.replyTo, conversation: conversationId });
    if (target) replyTo = input.replyTo;
  }

  let message: MessageDocument;
  try {
    message = await Message.create({
      conversation: conversationId,
      sender: user._id,
      content: input.content?.trim() || '',
      attachment: input.attachment,
      replyTo,
      clientTempId: input.clientTempId,
    });
  } catch (err) {
    if (isDuplicateKeyError(err) && input.clientTempId) {
      const existing = await Message.findOne({
        sender: user._id,
        clientTempId: input.clientTempId,
      }).populate(MESSAGE_POPULATE);
      if (existing) return existing; // duplicate retry — already persisted & broadcast
    }
    throw err;
  }

  await Conversation.updateOne({ _id: conversationId }, { lastMessage: message._id });

  const populated = await message.populate(MESSAGE_POPULATE);
  await broadcastToConversation(io, conversationId, 'message:new', { message: populated });
  return populated;
}

export async function editMessage(
  user: UserDocument,
  conversationId: string,
  messageId: string,
  content: string,
  io: Server
): Promise<MessageDocument> {
  await requireMembership(user, conversationId);

  const message = await Message.findOne({ _id: messageId, conversation: conversationId });
  if (!message) throw notFound('Message not found');
  if (!message.sender.equals(user._id)) throw forbidden('You can only edit your own messages');
  if (message.deletedAt) throw badRequest('Cannot edit a deleted message');

  message.content = content.trim();
  message.editedAt = new Date();
  await message.save();

  const populated = await message.populate(MESSAGE_POPULATE);
  await broadcastToConversation(io, conversationId, 'message:updated', { message: populated });
  return populated;
}

export async function deleteMessage(
  user: UserDocument,
  conversationId: string,
  messageId: string,
  io: Server
): Promise<void> {
  await requireMembership(user, conversationId);

  const message = await Message.findOne({ _id: messageId, conversation: conversationId });
  if (!message) throw notFound('Message not found');
  if (!message.sender.equals(user._id)) throw forbidden('You can only delete your own messages');

  message.content = '';
  message.attachment = undefined;
  message.deletedAt = new Date();
  await message.save();

  await broadcastToConversation(io, conversationId, 'message:deleted', {
    conversationId,
    messageId,
  });
}

/** Toggle the caller's reaction with `emoji` on a message and broadcast the result. */
export async function toggleReaction(
  user: UserDocument,
  conversationId: string,
  messageId: string,
  emoji: string,
  io: Server
): Promise<IReaction[]> {
  await requireMembership(user, conversationId);

  const message = await Message.findOne({ _id: messageId, conversation: conversationId });
  if (!message) throw notFound('Message not found');

  const groupIdx = message.reactions.findIndex((r) => r.emoji === emoji);
  if (groupIdx >= 0) {
    const group = message.reactions[groupIdx];
    const userIdx = group.users.findIndex((u) => u.equals(user._id));
    if (userIdx >= 0) {
      group.users.splice(userIdx, 1);
      if (group.users.length === 0) message.reactions.splice(groupIdx, 1);
    } else {
      group.users.push(user._id);
    }
  } else {
    message.reactions.push({ emoji, users: [user._id] });
  }

  await message.save();

  await broadcastToConversation(io, conversationId, 'message:reaction', {
    conversationId,
    messageId,
    reactions: message.reactions,
  });
  return message.reactions;
}
