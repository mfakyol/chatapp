import type { Server } from 'socket.io';
import { Types } from 'mongoose';
import Friendship, { sortedPair } from '../models/Friendship';
import User, { PublicUser, UserDocument } from '../models/User';
import { badRequest, conflict, notFound } from '../errors/AppError';
import { userRoom } from '../utils/rooms';
import { presence } from '../utils/presence';

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

export function withPresence(user: UserDocument): PublicUser & { isOnline: boolean } {
  return { ...user.toPublicJSON(), isOnline: presence.isOnline(user._id.toString()) };
}

async function findTarget(username: string | undefined): Promise<UserDocument> {
  const target = await User.findOne({ username: username?.toLowerCase() });
  if (!target) throw notFound('User not found');
  return target;
}

export async function friendIds(userId: Types.ObjectId): Promise<string[]> {
  const links = await Friendship.find({
    status: 'accepted',
    $or: [{ userA: userId }, { userB: userId }],
  }).select('userA userB');
  const me = userId.toString();
  return links.map((l) => (l.userA.toString() === me ? l.userB.toString() : l.userA.toString()));
}

export async function sendFriendRequest(
  me: UserDocument,
  username: string | undefined,
  io: Server
): Promise<{ auto: boolean }> {
  const target = await findTarget(username);
  if (target._id.equals(me._id)) throw badRequest('You cannot add yourself');

  const pair = sortedPair(me._id, target._id);
  try {
    await Friendship.create({ ...pair, requestedBy: me._id, status: 'pending' });
    io.to(userRoom(target._id)).emit('friend:request', { user: withPresence(me) });
    return { auto: false };
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;

    const existing = await Friendship.findOne(pair);
    if (!existing) throw err;
    if (existing.status === 'accepted') throw conflict('Already friends');
    if (existing.requestedBy.equals(me._id)) throw conflict('Friend request already sent');

    existing.status = 'accepted';
    await existing.save();
    io.to(userRoom(me._id)).emit('friend:accepted', { user: withPresence(target) });
    io.to(userRoom(target._id)).emit('friend:accepted', { user: withPresence(me) });
    return { auto: true };
  }
}

export async function acceptFriendRequest(
  me: UserDocument,
  username: string,
  io: Server
): Promise<void> {
  const other = await findTarget(username);
  const updated = await Friendship.findOneAndUpdate(
    { ...sortedPair(me._id, other._id), status: 'pending', requestedBy: other._id },
    { status: 'accepted' }
  );
  if (!updated) throw badRequest('No pending friend request from this user');

  io.to(userRoom(me._id)).emit('friend:accepted', { user: withPresence(other) });
  io.to(userRoom(other._id)).emit('friend:accepted', { user: withPresence(me) });
}

export async function declineFriendRequest(
  me: UserDocument,
  username: string,
  io: Server
): Promise<void> {
  const other = await findTarget(username);
  await Friendship.deleteOne({
    ...sortedPair(me._id, other._id),
    status: 'pending',
    requestedBy: other._id,
  });
  io.to(userRoom(other._id)).emit('friend:declined', { user: withPresence(me) });
}

export async function removeFriend(
  me: UserDocument,
  username: string,
  io: Server
): Promise<void> {
  const other = await findTarget(username);
  await Friendship.deleteOne({ ...sortedPair(me._id, other._id), status: 'accepted' });
  io.to(userRoom(other._id)).emit('friend:removed', { user: withPresence(me) });
}

export async function areFriends(a: Types.ObjectId, b: Types.ObjectId): Promise<boolean> {
  return !!(await Friendship.exists({ ...sortedPair(a, b), status: 'accepted' }));
}

export async function listFriends(me: UserDocument) {
  const ids = await friendIds(me._id);
  const users = await User.find({ _id: { $in: ids } });
  return users.map(withPresence);
}

export async function listFriendRequests(me: UserDocument) {
  const pending = await Friendship.find({
    status: 'pending',
    $or: [{ userA: me._id }, { userB: me._id }],
  });

  const otherId = (f: (typeof pending)[number]) =>
    f.userA.equals(me._id) ? f.userB : f.userA;

  const received = pending.filter((f) => !f.requestedBy.equals(me._id));
  const sent = pending.filter((f) => f.requestedBy.equals(me._id));

  const users = await User.find({ _id: { $in: pending.map(otherId) } });
  const byId = new Map(users.map((u) => [u._id.toString(), u]));
  const resolve = (list: typeof pending) => {
    const result = [];
    for (const f of list) {
      const u = byId.get(otherId(f).toString());
      if (u) result.push(withPresence(u));
    }
    return result;
  };

  return { received: resolve(received), sent: resolve(sent) };
}
