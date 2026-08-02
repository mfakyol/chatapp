import fs from 'fs/promises';
import path from 'path';
import type { Server } from 'socket.io';
import { Types } from 'mongoose';
import Conversation, { ConversationDocument, directKeyFor } from '../models/Conversation';
import ConversationMember from '../models/ConversationMember';
import Message from '../models/Message';
import User, { UserDocument } from '../models/User';
import { badRequest, conflict, forbidden, notFound } from '../errors/AppError';
import { userRoom, userRooms } from '../utils/rooms';
import { presence } from '../utils/presence';
import { areFriends } from './friendship.service';
import { broadcastToConversation } from './fanout';
import {
  UPLOADS_DIR,
  assertSafeFilename,
  normalizeMime,
  validateUploadedFile,
} from '../utils/attachments';

const LAST_MESSAGE_POPULATE = {
  path: 'lastMessage',
  populate: { path: 'sender', select: 'username firstName lastName' },
};

export interface AssembledConversation {
  [key: string]: unknown;
  _id: Types.ObjectId;
  isGroup: boolean;
  participants: unknown[];
  admins: string[];
  members: { user: unknown; role: string; lastReadAt: Date }[];
  unreadCount?: number;
}

const MEMBER_USER_SELECT = 'username firstName lastName avatarUrl bio lastSeen';

interface PopulatedMember {
  user: {
    _id: Types.ObjectId;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
    bio: string;
    lastSeen: Date;
  };
  role: string;
  lastReadAt: Date;
}

function publicMemberUser(m: PopulatedMember) {
  return {
    id: m.user._id,
    _id: m.user._id,
    username: m.user.username,
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    avatarUrl: m.user.avatarUrl,
    bio: m.user.bio,
    lastSeen: m.user.lastSeen,
    isOnline: presence.isOnline(m.user._id.toString()),
  };
}

function assemble(
  conversation: ConversationDocument,
  members: PopulatedMember[]
): AssembledConversation {
  return {
    ...conversation.toObject(),
    isGroup: conversation.type === 'group',
    participants: members.map(publicMemberUser),
    admins: members.filter((m) => m.role === 'admin').map((m) => m.user._id.toString()),
    members: members.map((m) => ({
      user: publicMemberUser(m),
      role: m.role,
      lastReadAt: m.lastReadAt,
    })),
  };
}

async function membersOf(conversationId: Types.ObjectId | string): Promise<PopulatedMember[]> {
  return ConversationMember.find({ conversation: conversationId }).populate<PopulatedMember>(
    'user',
    MEMBER_USER_SELECT
  ) as unknown as Promise<PopulatedMember[]>;
}

export async function assembleConversation(
  conversation: ConversationDocument
): Promise<AssembledConversation> {
  await conversation.populate(LAST_MESSAGE_POPULATE);
  return assemble(conversation, await membersOf(conversation._id));
}

export async function requireMembership(user: UserDocument, conversationId: string) {
  const membership = await ConversationMember.findOne({
    conversation: conversationId,
    user: user._id,
  });
  if (!membership) throw notFound('Conversation not found');
  return membership;
}

async function requireGroupAdmin(user: UserDocument, conversationId: string, error: string) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || conversation.type !== 'group') throw notFound('Group not found');
  const membership = await requireMembership(user, conversationId);
  if (membership.role !== 'admin') throw forbidden(error);
  return conversation;
}

export async function listConversations(user: UserDocument) {
  const memberships = await ConversationMember.find({ user: user._id });
  if (memberships.length === 0) return [];
  const convIds = memberships.map((m) => m.conversation);

  const [conversations, allMembers, unreadAgg] = await Promise.all([
    Conversation.find({ _id: { $in: convIds } })
      .populate(LAST_MESSAGE_POPULATE)
      .sort({ updatedAt: -1 }),
    ConversationMember.find({ conversation: { $in: convIds } }).populate<PopulatedMember>(
      'user',
      MEMBER_USER_SELECT
    ),
    Message.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          sender: { $ne: user._id },
          deletedAt: null,
          $or: memberships.map((m) => ({
            conversation: m.conversation,
            createdAt: { $gt: m.lastReadAt ?? new Date(0) },
          })),
        },
      },
      { $group: { _id: '$conversation', count: { $sum: 1 } } },
    ]),
  ]);

  const membersByConv = new Map<string, PopulatedMember[]>();
  for (const m of allMembers as unknown as (PopulatedMember & {
    conversation: Types.ObjectId;
  })[]) {
    const key = m.conversation.toString();
    if (!membersByConv.has(key)) membersByConv.set(key, []);
    membersByConv.get(key)!.push(m);
  }

  const unreadByConv = new Map(unreadAgg.map((u) => [u._id.toString(), u.count]));

  return conversations.map((c) => ({
    ...assemble(c, membersByConv.get(c._id.toString()) ?? []),
    unreadCount: unreadByConv.get(c._id.toString()) ?? 0,
  }));
}

export async function createDirectConversation(
  user: UserDocument,
  username: string | undefined,
  io: Server
): Promise<AssembledConversation> {
  const other = await User.findOne({ username: username?.toLowerCase() });
  if (!other) throw notFound('User not found');
  if (other._id.equals(user._id)) throw badRequest('Cannot start a conversation with yourself');
  if (!(await areFriends(user._id, other._id))) throw forbidden('You can only message friends');

  const conversation = await Conversation.findOneAndUpdate(
    { directKey: directKeyFor(user._id, other._id) },
    { $setOnInsert: { type: 'direct', createdBy: user._id } },
    { upsert: true, new: true }
  );

  await ConversationMember.bulkWrite(
    [user._id, other._id].map((uid) => ({
      updateOne: {
        filter: { conversation: conversation._id, user: uid },
        update: { $setOnInsert: { conversation: conversation._id, user: uid, role: 'member' } },
        upsert: true,
      },
    }))
  );

  const assembled = await assembleConversation(conversation);
  io.to(userRooms([user._id, other._id])).emit('conversation:new', { conversation: assembled });
  return assembled;
}

export async function createGroupConversation(
  user: UserDocument,
  name: string,
  usernames: string[],
  io: Server
): Promise<AssembledConversation> {
  const wanted = [...new Set(usernames.map((u) => u.toLowerCase()))].filter(
    (u) => u !== user.username
  );
  if (wanted.length < 1) throw badRequest('At least 1 other member is required');

  const members = await User.find({ username: { $in: wanted } });
  if (members.length !== wanted.length) {
    throw notFound('Some users were not found');
  }
  const friendChecks = await Promise.all(members.map((m) => areFriends(user._id, m._id)));
  if (friendChecks.some((ok) => !ok)) {
    throw forbidden('You can only add friends to a group');
  }

  const conversation = await Conversation.create({ type: 'group', name, createdBy: user._id });
  await ConversationMember.insertMany([
    { conversation: conversation._id, user: user._id, role: 'admin' },
    ...members.map((m) => ({ conversation: conversation._id, user: m._id, role: 'member' })),
  ]);

  const assembled = await assembleConversation(conversation);
  io.to(userRooms([user._id, ...members.map((m) => m._id)])).emit('conversation:new', {
    conversation: assembled,
  });
  return assembled;
}

export async function renameConversation(
  user: UserDocument,
  conversationId: string,
  updates: { name?: string; description?: string },
  io: Server
): Promise<AssembledConversation> {
  const conversation = await requireGroupAdmin(
    user,
    conversationId,
    'Only admins can update the group'
  );
  if (updates.name !== undefined) conversation.name = updates.name.trim();
  if (updates.description !== undefined) conversation.description = updates.description.trim();
  await conversation.save();

  const assembled = await assembleConversation(conversation);
  await broadcastToConversation(io, conversationId, 'conversation:updated', {
    conversation: assembled,
  });
  return assembled;
}

async function deleteGroupAvatarFile(filename: string): Promise<void> {
  if (!filename) return;
  assertSafeFilename(filename);
  if (!filename.startsWith('avatar-')) return;
  try {
    await fs.unlink(path.join(UPLOADS_DIR, filename));
  } catch {
    void 0;
  }
}

export async function setGroupAvatar(
  user: UserDocument,
  conversationId: string,
  filePath: string,
  mime: string,
  io: Server
): Promise<AssembledConversation> {
  const conversation = await requireGroupAdmin(
    user,
    conversationId,
    'Only admins can change the group photo'
  );
  await validateUploadedFile(filePath, mime);
  const filename = path.basename(filePath);
  const previous = conversation.avatarUrl;
  conversation.avatarUrl = filename;
  await conversation.save();
  if (previous && previous !== filename) await deleteGroupAvatarFile(previous);

  const assembled = await assembleConversation(conversation);
  await broadcastToConversation(io, conversationId, 'conversation:updated', {
    conversation: assembled,
  });
  return assembled;
}

export async function resolveGroupAvatar(user: UserDocument, conversationId: string) {
  await requireMembership(user, conversationId);
  const conversation = await Conversation.findById(conversationId);
  if (!conversation?.avatarUrl) throw notFound('Avatar not found');
  assertSafeFilename(conversation.avatarUrl);
  const filePath = path.join(UPLOADS_DIR, conversation.avatarUrl);
  try {
    await fs.access(filePath);
  } catch {
    throw notFound('Avatar not found');
  }
  const mime = normalizeMime(
    conversation.avatarUrl.endsWith('.png')
      ? 'image/png'
      : conversation.avatarUrl.endsWith('.webp')
        ? 'image/webp'
        : conversation.avatarUrl.endsWith('.gif')
          ? 'image/gif'
          : 'image/jpeg'
  );
  return { filePath, mimeType: mime || 'image/jpeg' };
}

export async function addMember(
  user: UserDocument,
  conversationId: string,
  username: string | undefined,
  io: Server
): Promise<AssembledConversation> {
  const conversation = await requireGroupAdmin(
    user,
    conversationId,
    'Only admins can add members'
  );

  const target = await User.findOne({ username: username?.toLowerCase() });
  if (!target) throw notFound('User not found');
  if (!(await areFriends(user._id, target._id))) throw forbidden('You can only add your friends');
  if (await ConversationMember.exists({ conversation: conversation._id, user: target._id })) {
    throw conflict('User is already a member');
  }

  await ConversationMember.create({
    conversation: conversation._id,
    user: target._id,
    role: 'member',
  });

  const assembled = await assembleConversation(conversation);
  io.to(userRoom(target._id)).emit('conversation:new', { conversation: assembled });
  await broadcastToConversation(
    io,
    conversationId,
    'conversation:updated',
    { conversation: assembled },
    { except: target._id }
  );
  return assembled;
}

export async function removeMember(
  user: UserDocument,
  conversationId: string,
  username: string,
  io: Server
): Promise<AssembledConversation> {
  const conversation = await requireGroupAdmin(
    user,
    conversationId,
    'Only admins can remove members'
  );

  const target = await User.findOne({ username: username.toLowerCase() });
  if (!target) throw notFound('User not found');
  if (target._id.equals(user._id)) throw badRequest('Use leave group instead');

  await ConversationMember.deleteOne({ conversation: conversation._id, user: target._id });

  const assembled = await assembleConversation(conversation);
  io.to(userRoom(target._id)).emit('conversation:deleted', { conversationId });
  await broadcastToConversation(io, conversationId, 'conversation:updated', {
    conversation: assembled,
  });
  return assembled;
}

export async function setMemberRole(
  user: UserDocument,
  conversationId: string,
  username: string,
  role: 'admin' | 'member',
  io: Server
): Promise<AssembledConversation> {
  const conversation = await requireGroupAdmin(
    user,
    conversationId,
    'Only admins can change member roles'
  );

  const target = await User.findOne({ username: username.toLowerCase() });
  if (!target) throw notFound('User not found');

  const membership = await ConversationMember.findOne({
    conversation: conversation._id,
    user: target._id,
  });
  if (!membership) throw notFound('Member not found');

  if (membership.role === 'admin' && role === 'member') {
    const adminCount = await ConversationMember.countDocuments({
      conversation: conversation._id,
      role: 'admin',
    });
    if (adminCount <= 1) throw badRequest('A group must have at least one admin');
  }

  membership.role = role;
  await membership.save();

  const assembled = await assembleConversation(conversation);
  await broadcastToConversation(io, conversationId, 'conversation:updated', {
    conversation: assembled,
  });
  return assembled;
}

export async function leaveGroup(
  user: UserDocument,
  conversationId: string,
  io: Server
): Promise<void> {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || conversation.type !== 'group') throw notFound('Group not found');
  await requireMembership(user, conversationId);

  await ConversationMember.deleteOne({ conversation: conversation._id, user: user._id });

  const remaining = await ConversationMember.find({ conversation: conversation._id }).sort({
    joinedAt: 1,
  });
  if (remaining.length > 0 && !remaining.some((m) => m.role === 'admin')) {
    remaining[0].role = 'admin';
    await remaining[0].save();
  }

  const assembled = await assembleConversation(conversation);
  io.to(userRoom(user._id)).emit('conversation:deleted', { conversationId });
  await broadcastToConversation(io, conversationId, 'conversation:updated', {
    conversation: assembled,
  });
}

export async function deleteConversation(
  user: UserDocument,
  conversationId: string,
  io: Server
): Promise<void> {
  const membership = await requireMembership(user, conversationId);
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw notFound('Conversation not found');
  if (conversation.type === 'group' && membership.role !== 'admin') {
    throw forbidden('Only admins can delete the group');
  }

  const memberIds = await ConversationMember.find({ conversation: conversation._id }).select(
    'user'
  );
  await conversation.deleteOne();

  io.to(userRooms(memberIds.map((m) => m.user))).emit('conversation:deleted', { conversationId });
}

export async function markConversationRead(
  user: UserDocument,
  conversationId: string,
  io: Server
): Promise<Date> {
  const lastReadAt = new Date();
  const updated = await ConversationMember.findOneAndUpdate(
    { conversation: conversationId, user: user._id },
    { lastReadAt }
  );
  if (!updated) throw notFound('Conversation not found');

  await broadcastToConversation(io, conversationId, 'conversation:read', {
    conversationId,
    userId: user._id,
    lastReadAt,
  });
  return lastReadAt;
}
