const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

async function listConversations(req, res, next) {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'username firstName lastName avatarUrl isOnline lastSeen')
      .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username firstName lastName' } })
      .sort({ updatedAt: -1 });

    const unreadCounts = await Message.aggregate([
      {
        $match: {
          conversation: { $in: conversations.map((c) => c._id) },
          sender: { $ne: req.user._id },
          'readBy.user': { $ne: req.user._id },
        },
      },
      { $group: { _id: '$conversation', count: { $sum: 1 } } },
    ]);
    const unreadMap = new Map(unreadCounts.map((u) => [u._id.toString(), u.count]));

    const withUnread = conversations.map((c) => ({
      ...c.toObject(),
      unreadCount: unreadMap.get(c._id.toString()) || 0,
    }));

    res.json({ conversations: withUnread });
  } catch (err) {
    next(err);
  }
}

async function createDirectConversation(req, res, next) {
  try {
    const { username } = req.body;
    const other = await User.findOne({ username: username?.toLowerCase() });
    if (!other) return res.status(404).json({ message: 'User not found' });
    if (other._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'Cannot start a conversation with yourself' });
    }
    if (!req.user.friends.some((id) => id.equals(other._id))) {
      return res.status(403).json({ message: 'You can only message friends' });
    }

    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, other._id], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        isGroup: false,
        participants: [req.user._id, other._id],
        createdBy: req.user._id,
      });
    }

    conversation = await conversation.populate('participants', 'username firstName lastName avatarUrl isOnline lastSeen');
    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
}

async function createGroupConversation(req, res, next) {
  try {
    const { name, usernames } = req.body;
    if (!name || !Array.isArray(usernames) || usernames.length < 2) {
      return res.status(400).json({ message: 'Group name and at least 2 other members are required' });
    }

    const members = await User.find({ username: { $in: usernames.map((u) => u.toLowerCase()) } });
    const memberIds = members.map((m) => m._id);
    const friendIds = new Set(req.user.friends.map((id) => id.toString()));
    const allFriends = memberIds.every((id) => friendIds.has(id.toString()));
    if (!allFriends) {
      return res.status(403).json({ message: 'You can only add friends to a group' });
    }

    const participants = [req.user._id, ...memberIds];

    const conversation = await Conversation.create({
      isGroup: true,
      name,
      participants,
      admins: [req.user._id],
      createdBy: req.user._id,
    });

    await conversation.populate('participants', 'username firstName lastName avatarUrl isOnline lastSeen');
    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
}

const MESSAGE_POPULATE = [
  { path: 'sender', select: 'username firstName lastName avatarUrl' },
  { path: 'readBy.user', select: 'username firstName lastName' },
];

async function getMessages(req, res, next) {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findOne({ _id: conversationId, participants: req.user._id });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    if (req.query.around) {
      const target = await Message.findOne({ _id: req.query.around, conversation: conversationId });
      if (!target) return res.status(404).json({ message: 'Message not found' });

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

      return res.json({ messages: [...before.reverse(), ...after] });
    }

    const before = req.query.before ? new Date(req.query.before) : null;
    const filter = { conversation: conversationId };
    if (before) filter.createdAt = { $lt: before };

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate(MESSAGE_POPULATE);

    res.json({ messages: messages.reverse() });
  } catch (err) {
    next(err);
  }
}

async function searchMessages(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ messages: [] });

    const { conversationId } = req.query;
    let conversationIds;

    if (conversationId) {
      const conversation = await Conversation.findOne({ _id: conversationId, participants: req.user._id });
      if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
      conversationIds = [conversation._id];
    } else {
      const conversations = await Conversation.find({ participants: req.user._id }).select('_id');
      conversationIds = conversations.map((c) => c._id);
    }

    const messages = await Message.find({
      conversation: { $in: conversationIds },
      content: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'username firstName lastName avatarUrl')
      .populate('conversation', 'name isGroup participants');

    res.json({ messages });
  } catch (err) {
    next(err);
  }
}

async function editMessage(req, res, next) {
  try {
    const { conversationId, messageId } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: 'Content is required' });

    const message = await Message.findOne({ _id: messageId, conversation: conversationId });
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (!message.sender.equals(req.user._id)) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }
    if (message.deletedAt) return res.status(400).json({ message: 'Cannot edit a deleted message' });

    message.content = content.trim();
    message.editedAt = new Date();
    await message.save();

    const populated = await message.populate(MESSAGE_POPULATE);
    req.app.get('io')?.to(conversationId).emit('message:edited', { message: populated });

    res.json({ message: populated });
  } catch (err) {
    next(err);
  }
}

async function deleteMessage(req, res, next) {
  try {
    const { conversationId, messageId } = req.params;
    const message = await Message.findOne({ _id: messageId, conversation: conversationId });
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (!message.sender.equals(req.user._id)) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    message.content = '';
    message.attachment = undefined;
    message.deletedAt = new Date();
    await message.save();

    req.app.get('io')?.to(conversationId).emit('message:deleted', { conversationId, messageId });

    res.json({ message: 'Message deleted' });
  } catch (err) {
    next(err);
  }
}

async function sendAttachment(req, res, next) {
  try {
    const { conversationId } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const conversation = await Conversation.findOne({ _id: conversationId, participants: req.user._id });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content: req.body.caption?.trim() || '',
      attachment: {
        url: `/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
      readBy: [{ user: req.user._id, readAt: new Date() }],
    });

    conversation.lastMessage = message._id;
    await conversation.save();

    const populated = await message.populate('sender', 'username firstName lastName avatarUrl');

    const io = req.app.get('io');
    io?.to(conversationId).emit('message:new', { message: populated });

    res.status(201).json({ message: populated });
  } catch (err) {
    next(err);
  }
}

const PARTICIPANT_SELECT = 'username firstName lastName avatarUrl isOnline lastSeen';
function userRoom(id) {
  return `user:${id}`;
}

async function renameConversation(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required' });

    const conversation = await Conversation.findOne({ _id: conversationId, participants: req.user._id });
    if (!conversation || !conversation.isGroup) return res.status(404).json({ message: 'Group not found' });
    if (!conversation.admins.some((id) => id.equals(req.user._id))) {
      return res.status(403).json({ message: 'Only admins can rename the group' });
    }

    conversation.name = name.trim();
    await conversation.save();
    await conversation.populate('participants', PARTICIPANT_SELECT);

    req.app.get('io')?.to(conversationId).emit('group:updated', { conversation });
    res.json({ conversation });
  } catch (err) {
    next(err);
  }
}

async function addMember(req, res, next) {
  try {
    const { conversationId } = req.params;
    const { username } = req.body;

    const conversation = await Conversation.findOne({ _id: conversationId, participants: req.user._id });
    if (!conversation || !conversation.isGroup) return res.status(404).json({ message: 'Group not found' });
    if (!conversation.admins.some((id) => id.equals(req.user._id))) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    const target = await User.findOne({ username: username?.toLowerCase() });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (!req.user.friends.some((id) => id.equals(target._id))) {
      return res.status(403).json({ message: 'You can only add your friends' });
    }
    if (conversation.participants.some((id) => id.equals(target._id))) {
      return res.status(409).json({ message: 'User is already a member' });
    }

    conversation.participants.push(target._id);
    await conversation.save();
    await conversation.populate('participants', PARTICIPANT_SELECT);

    const io = req.app.get('io');
    io?.in(userRoom(target._id)).socketsJoin(conversationId);
    io?.to(conversationId).emit('group:updated', { conversation });

    res.json({ conversation });
  } catch (err) {
    next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    const { conversationId, username } = req.params;

    const conversation = await Conversation.findOne({ _id: conversationId, participants: req.user._id });
    if (!conversation || !conversation.isGroup) return res.status(404).json({ message: 'Group not found' });
    if (!conversation.admins.some((id) => id.equals(req.user._id))) {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }

    const target = await User.findOne({ username: username.toLowerCase() });
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'Use leave group instead' });
    }

    conversation.participants.pull(target._id);
    conversation.admins.pull(target._id);
    await conversation.save();
    await conversation.populate('participants', PARTICIPANT_SELECT);

    const io = req.app.get('io');
    io?.to(userRoom(target._id)).emit('group:removed', { conversationId });
    io?.in(userRoom(target._id)).socketsLeave(conversationId);
    io?.to(conversationId).emit('group:updated', { conversation });

    res.json({ conversation });
  } catch (err) {
    next(err);
  }
}

async function leaveGroup(req, res, next) {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({ _id: conversationId, participants: req.user._id });
    if (!conversation || !conversation.isGroup) return res.status(404).json({ message: 'Group not found' });

    conversation.participants.pull(req.user._id);
    conversation.admins.pull(req.user._id);

    if (conversation.admins.length === 0 && conversation.participants.length > 0) {
      conversation.admins.push(conversation.participants[0]);
    }

    await conversation.save();
    await conversation.populate('participants', PARTICIPANT_SELECT);

    const io = req.app.get('io');
    io?.to(conversationId).emit('group:updated', { conversation });
    io?.to(userRoom(req.user._id)).emit('group:removed', { conversationId });
    io?.in(userRoom(req.user._id)).socketsLeave(conversationId);

    res.json({ message: 'Left group' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listConversations,
  createDirectConversation,
  createGroupConversation,
  getMessages,
  searchMessages,
  editMessage,
  deleteMessage,
  sendAttachment,
  renameConversation,
  addMember,
  removeMember,
  leaveGroup,
};
