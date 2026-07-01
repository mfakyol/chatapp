const User = require('../models/User');

function userRoom(id) {
  return `user:${id}`;
}

async function searchUsers(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) return res.json({ users: [] });

    const query = q.trim().toLowerCase();
    const users = await User.find({
      username: { $regex: `^${query}`, $options: 'i' },
      _id: { $ne: req.user._id },
    })
      .select('username firstName lastName avatarUrl isOnline')
      .limit(20);

    res.json({ users });
  } catch (err) {
    next(err);
  }
}

async function sendFriendRequest(req, res, next) {
  try {
    const { username } = req.params;
    const target = await User.findOne({ username: username.toLowerCase() });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'You cannot add yourself' });
    }

    if (req.user.friends.some((id) => id.equals(target._id))) {
      return res.status(409).json({ message: 'Already friends' });
    }
    if (target.friendRequestsReceived.some((id) => id.equals(req.user._id))) {
      return res.status(409).json({ message: 'Friend request already sent' });
    }

    const io = req.app.get('io');

    if (req.user.friendRequestsReceived.some((id) => id.equals(target._id))) {
      await acceptFriendRequestInternal(req.user, target, io);
      return res.json({ message: 'Friend request accepted' });
    }

    target.friendRequestsReceived.push(req.user._id);
    req.user.friendRequestsSent.push(target._id);
    await target.save();
    await req.user.save();

    io?.to(userRoom(target._id)).emit('friend:request', { user: req.user.toPublicJSON() });

    res.status(201).json({ message: 'Friend request sent' });
  } catch (err) {
    next(err);
  }
}

async function acceptFriendRequestInternal(currentUser, otherUser, io) {
  currentUser.friends.addToSet(otherUser._id);
  otherUser.friends.addToSet(currentUser._id);
  currentUser.friendRequestsReceived.pull(otherUser._id);
  currentUser.friendRequestsSent.pull(otherUser._id);
  otherUser.friendRequestsReceived.pull(currentUser._id);
  otherUser.friendRequestsSent.pull(currentUser._id);
  await currentUser.save();
  await otherUser.save();

  io?.to(userRoom(currentUser._id)).emit('friend:accepted', { user: otherUser.toPublicJSON() });
  io?.to(userRoom(otherUser._id)).emit('friend:accepted', { user: currentUser.toPublicJSON() });
}

async function acceptFriendRequest(req, res, next) {
  try {
    const { username } = req.params;
    const other = await User.findOne({ username: username.toLowerCase() });
    if (!other) return res.status(404).json({ message: 'User not found' });

    if (!req.user.friendRequestsReceived.some((id) => id.equals(other._id))) {
      return res.status(400).json({ message: 'No pending friend request from this user' });
    }

    await acceptFriendRequestInternal(req.user, other, req.app.get('io'));
    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    next(err);
  }
}

async function declineFriendRequest(req, res, next) {
  try {
    const { username } = req.params;
    const other = await User.findOne({ username: username.toLowerCase() });
    if (!other) return res.status(404).json({ message: 'User not found' });

    req.user.friendRequestsReceived.pull(other._id);
    other.friendRequestsSent.pull(req.user._id);
    await req.user.save();
    await other.save();

    req.app.get('io')?.to(userRoom(other._id)).emit('friend:declined', { user: req.user.toPublicJSON() });

    res.json({ message: 'Friend request declined' });
  } catch (err) {
    next(err);
  }
}

async function removeFriend(req, res, next) {
  try {
    const { username } = req.params;
    const other = await User.findOne({ username: username.toLowerCase() });
    if (!other) return res.status(404).json({ message: 'User not found' });

    req.user.friends.pull(other._id);
    other.friends.pull(req.user._id);
    await req.user.save();
    await other.save();

    req.app.get('io')?.to(userRoom(other._id)).emit('friend:removed', { user: req.user.toPublicJSON() });

    res.json({ message: 'Friend removed' });
  } catch (err) {
    next(err);
  }
}

async function getFriends(req, res, next) {
  try {
    const user = await req.user.populate('friends', 'username firstName lastName avatarUrl isOnline lastSeen');
    res.json({ friends: user.friends });
  } catch (err) {
    next(err);
  }
}

async function getFriendRequests(req, res, next) {
  try {
    const user = await req.user.populate([
      { path: 'friendRequestsReceived', select: 'username firstName lastName avatarUrl' },
      { path: 'friendRequestsSent', select: 'username firstName lastName avatarUrl' },
    ]);
    res.json({
      received: user.friendRequestsReceived,
      sent: user.friendRequestsSent,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  getFriends,
  getFriendRequests,
};
