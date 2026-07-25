import type { Server } from 'socket.io';
import type { SessionData } from 'express-session';
import User from '../models/User';
import ConversationMember from '../models/ConversationMember';
import { loadUser } from '../utils/userCache';
import { userRoom, userRooms } from '../utils/rooms';
import { presence } from '../utils/presence';
import { friendIds } from '../services/friendship.service';
import { socketConversationId } from '../schemas/socket.schema';
import { broadcastToConversation } from '../services/fanout';
import { logger } from '../config/logger';

/**
 * The socket layer is a downstream delivery channel only. Every mutation goes
 * through REST; the single client→server signal is `typing` (ephemeral, never
 * persisted). On connect a socket joins exactly ONE room — `user:<id>` — and
 * all fan-out resolves recipients from the database at send time.
 */
export function registerSocketHandlers(io: Server): void {
  io.use(async (socket, next) => {
    try {
      // The shared express-session middleware (mounted via io.engine.use) has
      // already parsed the httpOnly cookie and loaded the session.
      const session = (socket.request as { session?: SessionData }).session;
      const userId = session?.userId;
      if (!userId) return next(new Error('Unauthorized'));

      const user = await loadUser(userId);
      if (!user) return next(new Error('Unauthorized'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    const userId = user._id.toString();

    socket.join(userRoom(userId));

    const relayTyping = (event: 'typing:start' | 'typing:stop') => async (payload: unknown) => {
      const parsed = socketConversationId.safeParse(payload);
      if (!parsed.success) return;
      const { conversationId } = parsed.data;
      // Membership check is implicit: non-members resolve to an empty member set
      // minus themselves, but verify explicitly so outsiders can't probe.
      const isMember = await ConversationMember.exists({
        conversation: conversationId,
        user: user._id,
      });
      if (!isMember) return;
      await broadcastToConversation(
        io,
        conversationId,
        event,
        { conversationId, userId: user._id },
        { except: user._id }
      );
    };

    socket.on('typing:start', relayTyping('typing:start'));
    socket.on('typing:stop', relayTyping('typing:stop'));

    socket.on('disconnect', async () => {
      try {
        if (!presence.down(userId)) return; // other tabs still connected
        const lastSeen = new Date();
        await User.updateOne({ _id: user._id }, { lastSeen });
        const friends = await friendIds(user._id);
        if (friends.length > 0) {
          io.to(userRooms(friends)).emit('presence:update', {
            userId: user._id,
            isOnline: false,
            lastSeen,
          });
        }
      } catch (err) {
        logger.error({ err }, 'presence disconnect handling failed');
      }
    });

    void (async () => {
      try {
        if (!presence.up(userId)) return; // was already online in another tab
        const friends = await friendIds(user._id);
        if (friends.length > 0) {
          io.to(userRooms(friends)).emit('presence:update', { userId: user._id, isOnline: true });
        }
      } catch (err) {
        logger.error({ err }, 'presence connect handling failed');
      }
    })();
  });
}

export default registerSocketHandlers;
