import type { Server } from 'socket.io';
import User, { UserDocument } from '../models/User';
import { badRequest, conflict, notFound } from '../errors/AppError';
import { userRoom } from '../utils/rooms';

function normalizeUsername(username: string | undefined): string {
  if (!username || !username.trim()) throw notFound('User not found');
  return username.toLowerCase();
}

export async function searchUsers(currentUser: UserDocument, rawQuery: unknown) {
  const q = typeof rawQuery === 'string' ? rawQuery.trim() : '';
  if (!q) return [];

  return User.find({
    username: { $regex: `^${q.toLowerCase()}`, $options: 'i' },
    _id: { $ne: currentUser._id },
  })
    .select('username firstName lastName avatarUrl isOnline')
    .limit(20);
}

/** Move the reciprocal request into a mutual friendship and notify both users. */
async function acceptFriendRequestInternal(
  currentUser: UserDocument,
  otherUser: UserDocument,
  io: Server
): Promise<void> {
  currentUser.friends.addToSet(otherUser._id);
  otherUser.friends.addToSet(currentUser._id);
  currentUser.friendRequestsReceived.pull(otherUser._id);
  currentUser.friendRequestsSent.pull(otherUser._id);
  otherUser.friendRequestsReceived.pull(currentUser._id);
  otherUser.friendRequestsSent.pull(currentUser._id);
  await currentUser.save();
  await otherUser.save();

  io.to(userRoom(currentUser._id)).emit('friend:accepted', { user: otherUser.toPublicJSON() });
  io.to(userRoom(otherUser._id)).emit('friend:accepted', { user: currentUser.toPublicJSON() });
}

export async function sendFriendRequest(
  currentUser: UserDocument,
  username: string | undefined,
  io: Server
): Promise<{ auto: boolean }> {
  const target = await User.findOne({ username: normalizeUsername(username) });
  if (!target) throw notFound('User not found');
  if (target._id.equals(currentUser._id)) throw badRequest('You cannot add yourself');

  if (currentUser.friends.some((id) => id.equals(target._id))) {
    throw conflict('Already friends');
  }
  if (target.friendRequestsReceived.some((id) => id.equals(currentUser._id))) {
    throw conflict('Friend request already sent');
  }

  // The other user already requested us → accept immediately.
  if (currentUser.friendRequestsReceived.some((id) => id.equals(target._id))) {
    await acceptFriendRequestInternal(currentUser, target, io);
    return { auto: true };
  }

  target.friendRequestsReceived.addToSet(currentUser._id);
  currentUser.friendRequestsSent.addToSet(target._id);
  await target.save();
  await currentUser.save();

  io.to(userRoom(target._id)).emit('friend:request', { user: currentUser.toPublicJSON() });
  return { auto: false };
}

export async function acceptFriendRequest(
  currentUser: UserDocument,
  username: string,
  io: Server
): Promise<void> {
  const other = await User.findOne({ username: normalizeUsername(username) });
  if (!other) throw notFound('User not found');
  if (!currentUser.friendRequestsReceived.some((id) => id.equals(other._id))) {
    throw badRequest('No pending friend request from this user');
  }
  await acceptFriendRequestInternal(currentUser, other, io);
}

export async function declineFriendRequest(
  currentUser: UserDocument,
  username: string,
  io: Server
): Promise<void> {
  const other = await User.findOne({ username: normalizeUsername(username) });
  if (!other) throw notFound('User not found');

  currentUser.friendRequestsReceived.pull(other._id);
  other.friendRequestsSent.pull(currentUser._id);
  await currentUser.save();
  await other.save();

  io.to(userRoom(other._id)).emit('friend:declined', { user: currentUser.toPublicJSON() });
}

export async function removeFriend(
  currentUser: UserDocument,
  username: string,
  io: Server
): Promise<void> {
  const other = await User.findOne({ username: normalizeUsername(username) });
  if (!other) throw notFound('User not found');

  currentUser.friends.pull(other._id);
  other.friends.pull(currentUser._id);
  await currentUser.save();
  await other.save();

  io.to(userRoom(other._id)).emit('friend:removed', { user: currentUser.toPublicJSON() });
}

export async function getFriends(currentUser: UserDocument) {
  const user = await currentUser.populate(
    'friends',
    'username firstName lastName avatarUrl isOnline lastSeen'
  );
  return user.friends;
}

export async function getFriendRequests(currentUser: UserDocument) {
  const user = await currentUser.populate([
    { path: 'friendRequestsReceived', select: 'username firstName lastName avatarUrl' },
    { path: 'friendRequestsSent', select: 'username firstName lastName avatarUrl' },
  ]);
  return {
    received: user.friendRequestsReceived,
    sent: user.friendRequestsSent,
  };
}
