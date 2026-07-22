import type { Server } from 'socket.io';
import User from '../models/User';
import Conversation from '../models/Conversation';
import { verifyToken } from '../utils/jwt';
import { userRoom } from '../utils/rooms';
import { AppError } from '../errors/AppError';
import { createMessage, markConversationRead } from '../services/message.service';
import { objectId } from '../schemas/common';
import { socketMessageSend, socketConversationId } from '../schemas/socket.schema';
import { createSlidingWindow } from '../utils/slidingWindow';

// Anti-spam: cap how many messages a single connection may send per window.
const MESSAGE_RATE_LIMIT = 10;
const MESSAGE_RATE_WINDOW_MS = 5000;

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
    const allowMessage = createSlidingWindow(MESSAGE_RATE_LIMIT, MESSAGE_RATE_WINDOW_MS);

    // Register all listeners synchronously before any `await` below, so events
    // emitted by the client immediately after connecting are never dropped
    // while this handler is still awaiting the setup work.
    socket.on('conversation:join', (conversationId: unknown) => {
      const parsed = objectId.safeParse(conversationId);
      if (parsed.success) socket.join(parsed.data);
    });

    socket.on('message:send', async (payload: unknown, callback?: (res: unknown) => void) => {
      const parsed = socketMessageSend.safeParse(payload);
      if (!parsed.success) {
        if (callback) callback({ error: 'Invalid message' });
        return;
      }
      if (!allowMessage()) {
        if (callback) callback({ error: 'You are sending messages too fast' });
        return;
      }
      try {
        const message = await createMessage(
          user,
          parsed.data.conversationId,
          { content: parsed.data.content },
          io
        );
        if (callback) callback({ message });
      } catch (err) {
        if (callback) {
          callback({ error: err instanceof AppError ? err.message : 'Failed to send message' });
        }
      }
    });

    socket.on('message:read', async (payload: unknown) => {
      const parsed = socketConversationId.safeParse(payload);
      if (!parsed.success) return;
      try {
        await markConversationRead(user, parsed.data.conversationId, io);
      } catch {
        // ignore read-receipt failures silently
      }
    });

    socket.on('typing:start', (payload: unknown) => {
      const parsed = socketConversationId.safeParse(payload);
      if (!parsed.success) return;
      const { conversationId } = parsed.data;
      socket.to(conversationId).emit('typing:start', { conversationId, userId: user._id });
    });

    socket.on('typing:stop', (payload: unknown) => {
      const parsed = socketConversationId.safeParse(payload);
      if (!parsed.success) return;
      const { conversationId } = parsed.data;
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
