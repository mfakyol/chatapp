import type { Server } from 'socket.io';
import User from '../models/User';
import Conversation from '../models/Conversation';
import { verifyToken } from '../utils/jwt';
import { userRoom } from '../utils/rooms';
import { AppError } from '../errors/AppError';
import { createMessage, markConversationRead } from '../services/message.service';

export function registerSocketHandlers(io: Server): void {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));

      const payload = verifyToken(token);
      const user = await User.findById(payload.sub);
      if (!user) return next(new Error('Unauthorized'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    // Register all listeners synchronously before any `await` below, so events
    // emitted by the client immediately after connecting are never dropped
    // while this handler is still awaiting the setup work.
    socket.on('conversation:join', (conversationId: string) => {
      socket.join(conversationId);
    });

    socket.on('message:send', async ({ conversationId, content }, callback) => {
      try {
        if (!content || !content.trim()) return;
        const message = await createMessage(user, conversationId, { content }, io);
        if (callback) callback({ message });
      } catch (err) {
        if (callback) {
          callback({ error: err instanceof AppError ? err.message : 'Failed to send message' });
        }
      }
    });

    socket.on('message:read', async ({ conversationId }) => {
      try {
        await markConversationRead(user, conversationId, io);
      } catch {
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
      socket.broadcast.emit('presence:update', {
        userId: user._id,
        isOnline: false,
        lastSeen: user.lastSeen,
      });
    });

    void (async () => {
      user.isOnline = true;
      await user.save();
      socket.broadcast.emit('presence:update', { userId: user._id, isOnline: true });

      socket.join(userRoom(user._id));

      const conversations = await Conversation.find({ participants: user._id }).select('_id');
      conversations.forEach((c) => socket.join(c._id.toString()));
    })();
  });
}

export default registerSocketHandlers;
