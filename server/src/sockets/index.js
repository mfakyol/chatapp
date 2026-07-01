const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

function registerSocketHandlers(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub);
      if (!user) return next(new Error('Unauthorized'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    // Register all listeners synchronously before any `await` below, so
    // events emitted by the client immediately after connecting are never
    // dropped while this handler is still awaiting the setup work.
    socket.on('conversation:join', (conversationId) => {
      socket.join(conversationId);
    });

    socket.on('message:send', async ({ conversationId, content }, callback) => {
      try {
        if (!content || !content.trim()) return;

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: user._id,
        });
        if (!conversation) {
          if (callback) callback({ error: 'Conversation not found' });
          return;
        }

        const message = await Message.create({
          conversation: conversationId,
          sender: user._id,
          content: content.trim(),
          readBy: [{ user: user._id, readAt: new Date() }],
        });

        conversation.lastMessage = message._id;
        await conversation.save();

        const populated = await message.populate('sender', 'username firstName lastName avatarUrl');

        io.to(conversationId).emit('message:new', { message: populated });
        if (callback) callback({ message: populated });
      } catch (err) {
        if (callback) callback({ error: 'Failed to send message' });
      }
    });

    socket.on('message:read', async ({ conversationId }) => {
      try {
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

        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $push: { readBy: { user: user._id, readAt } } }
        );

        io.to(conversationId).emit('message:read', {
          conversationId,
          userId: user._id,
          readAt,
          messageIds,
        });
      } catch (err) {
        // ignore read-receipt failures silently
      }
    });

    socket.on('typing:start', ({ conversationId }) => {
      socket.to(conversationId).emit('typing:start', { conversationId, userId: user._id });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(conversationId).emit('typing:stop', { conversationId, userId: user._id });
    });

    socket.on('disconnect', async () => {
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
      socket.broadcast.emit('presence:update', { userId: user._id, isOnline: false, lastSeen: user.lastSeen });
    });

    (async () => {
      user.isOnline = true;
      await user.save();
      socket.broadcast.emit('presence:update', { userId: user._id, isOnline: true });

      socket.join(`user:${user._id}`);

      const conversations = await Conversation.find({ participants: user._id }).select('_id');
      conversations.forEach((c) => socket.join(c._id.toString()));
    })();
  });
}

module.exports = registerSocketHandlers;
