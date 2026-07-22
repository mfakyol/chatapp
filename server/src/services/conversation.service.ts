import type { Server } from 'socket.io';
import Conversation, { ConversationDocument } from '../models/Conversation';
import Message from '../models/Message';
import User from '../models/User';
import type { UserDocument } from '../models/User';
import { badRequest, conflict, forbidden, notFound } from '../errors/AppError';
import { userRoom } from '../utils/rooms';

const PARTICIPANT_SELECT = 'username firstName lastName avatarUrl isOnline lastSeen';

function normalizeUsername(username: string | undefined): string {
  if (!username || !username.trim()) throw notFound('User not found');
  return username.toLowerCase();
}

/** Load a group the caller belongs to and assert they are an admin. */
async function requireGroupAdmin(
  user: UserDocument,
  conversationId: string,
  adminError: string
): Promise<ConversationDocument> {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: user._id,
  });
  if (!conversation || !conversation.isGroup) throw notFound('Group not found');
  if (!conversation.admins.some((id) => id.equals(user._id))) throw forbidden(adminError);
  return conversation;
}

export async function listConversations(user: UserDocument) {
  const conversations = await Conversation.find({ participants: user._id })
    .populate('participants', PARTICIPANT_SELECT)
    .populate({
      path: 'lastMessage',
      populate: { path: 'sender', select: 'username firstName lastName' },
    })
    .sort({ updatedAt: -1 });

  const unreadCounts = await Message.aggregate<{ _id: unknown; count: number }>([
    {
      $match: {
        conversation: { $in: conversations.map((c) => c._id) },
        sender: { $ne: user._id },
        'readBy.user': { $ne: user._id },
      },
    },
    { $group: { _id: '$conversation', count: { $sum: 1 } } },
  ]);
  const unreadMap = new Map(unreadCounts.map((u) => [String(u._id), u.count]));

  return conversations.map((c) => ({
    ...c.toObject(),
    unreadCount: unreadMap.get(c._id.toString()) ?? 0,
  }));
}

export async function createDirectConversation(
  user: UserDocument,
  username: string | undefined
): Promise<ConversationDocument> {
  const other = await User.findOne({ username: normalizeUsername(username) });
  if (!other) throw notFound('User not found');
  if (other._id.equals(user._id)) throw badRequest('Cannot start a conversation with yourself');
  if (!user.friends.some((id) => id.equals(other._id))) {
    throw forbidden('You can only message friends');
  }

  let conversation = await Conversation.findOne({
    isGroup: false,
    participants: { $all: [user._id, other._id], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      isGroup: false,
      participants: [user._id, other._id],
      createdBy: user._id,
    });
  }

  return conversation.populate('participants', PARTICIPANT_SELECT);
}

export async function createGroupConversation(
  user: UserDocument,
  name: string,
  usernames: string[]
): Promise<ConversationDocument> {
  const members = await User.find({
    username: { $in: usernames.map((u) => u.toLowerCase()) },
  });
  const memberIds = members.map((m) => m._id);
  const friendIds = new Set(user.friends.map((id) => id.toString()));
  const allFriends = memberIds.every((id) => friendIds.has(id.toString()));
  if (!allFriends) throw forbidden('You can only add friends to a group');

  const conversation = await Conversation.create({
    isGroup: true,
    name,
    participants: [user._id, ...memberIds],
    admins: [user._id],
    createdBy: user._id,
  });

  return conversation.populate('participants', PARTICIPANT_SELECT);
}

export async function renameConversation(
  user: UserDocument,
  conversationId: string,
  name: string,
  io: Server
): Promise<ConversationDocument> {
  const conversation = await requireGroupAdmin(
    user,
    conversationId,
    'Only admins can rename the group'
  );

  conversation.name = name.trim();
  await conversation.save();
  await conversation.populate('participants', PARTICIPANT_SELECT);

  io.to(conversationId).emit('group:updated', { conversation });
  return conversation;
}

export async function addMember(
  user: UserDocument,
  conversationId: string,
  username: string | undefined,
  io: Server
): Promise<ConversationDocument> {
  const conversation = await requireGroupAdmin(
    user,
    conversationId,
    'Only admins can add members'
  );

  const target = await User.findOne({ username: normalizeUsername(username) });
  if (!target) throw notFound('User not found');
  if (!user.friends.some((id) => id.equals(target._id))) {
    throw forbidden('You can only add your friends');
  }
  if (conversation.participants.some((id) => id.equals(target._id))) {
    throw conflict('User is already a member');
  }

  conversation.participants.push(target._id);
  await conversation.save();
  await conversation.populate('participants', PARTICIPANT_SELECT);

  io.in(userRoom(target._id)).socketsJoin(conversationId);
  io.to(conversationId).emit('group:updated', { conversation });
  return conversation;
}

export async function removeMember(
  user: UserDocument,
  conversationId: string,
  username: string,
  io: Server
): Promise<ConversationDocument> {
  const conversation = await requireGroupAdmin(
    user,
    conversationId,
    'Only admins can remove members'
  );

  const target = await User.findOne({ username: normalizeUsername(username) });
  if (!target) throw notFound('User not found');
  if (target._id.equals(user._id)) throw badRequest('Use leave group instead');

  conversation.participants.pull(target._id);
  conversation.admins.pull(target._id);
  await conversation.save();
  await conversation.populate('participants', PARTICIPANT_SELECT);

  io.to(userRoom(target._id)).emit('group:removed', { conversationId });
  io.in(userRoom(target._id)).socketsLeave(conversationId);
  io.to(conversationId).emit('group:updated', { conversation });
  return conversation;
}

export async function leaveGroup(
  user: UserDocument,
  conversationId: string,
  io: Server
): Promise<void> {
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: user._id,
  });
  if (!conversation || !conversation.isGroup) throw notFound('Group not found');

  conversation.participants.pull(user._id);
  conversation.admins.pull(user._id);

  if (conversation.admins.length === 0 && conversation.participants.length > 0) {
    conversation.admins.push(conversation.participants[0]);
  }

  await conversation.save();
  await conversation.populate('participants', PARTICIPANT_SELECT);

  io.to(conversationId).emit('group:updated', { conversation });
  io.to(userRoom(user._id)).emit('group:removed', { conversationId });
  io.in(userRoom(user._id)).socketsLeave(conversationId);
}
